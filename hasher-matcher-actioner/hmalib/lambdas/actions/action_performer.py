# Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved

import json
import os
import boto3
import typing as t
import datetime
from functools import lru_cache
from mypy_boto3_dynamodb import DynamoDBServiceResource

from hmalib.common.message_models import BankedSignal, ActionMessage, MatchMessage
from hmalib.common.actioner_models import (
    ActionPerformer,
    WebhookPostActionPerformer,
)
from hmalib.common.evaluator_models import ActionLabel
from hmalib.common.content_models import ActionEvent
from hmalib.common.logging import get_logger
from hmalib.common import config


logger = get_logger(__name__)
dynamodb: DynamoDBServiceResource = boto3.resource("dynamodb")

DYNAMODB_TABLE = os.environ["DYNAMODB_TABLE"]


@lru_cache(maxsize=1)
def lambda_init_once():
    """
    Do some late initialization for required lambda components.

    Lambda initialization is weird - despite the existence of perfectly
    good constructions like __name__ == __main__, there don't appear
    to be easy ways to split your lambda-specific logic from your
    module logic except by splitting up the files and making your
    lambda entry as small as possible.

    TODO: Just refactor this file to separate the lambda and functional
          components
    """
    config_table = os.environ["CONFIG_TABLE_NAME"]
    config.HMAConfig.initialize(config_table)


def perform_label_action(
    match_message: MatchMessage, action_label: ActionLabel
) -> bool:
    if action_performer := ActionPerformer.get(action_label.value):
        action_performer.perform_action(match_message)
        return True
    return False


def lambda_handler(event, context):
    """
    This is the main entry point for performing an action. The action evaluator puts
    an action message on the actions queue and here's where they're popped
    off and dealt with.
    """
    records_table = dynamodb.Table(DYNAMODB_TABLE)

    lambda_init_once()
    for sqs_record in event["Records"]:
        # TODO research max # sqs records / lambda_handler invocation
        action_message = ActionMessage.from_aws_json(sqs_record["body"])

        logger.info("Performing action: action_message = %s", action_message)

        perform_label_action(action_message, action_message.action_label)

        ActionEvent(
            content_id=action_message.content_key,
            performed_at=datetime.datetime.now(),
            # TODO this action_label is an indirection for ActionPerformer look up
            # we probably also want to store its state (or at least it version once one exists)
            action_label=action_message.action_label.value,
            # Hack: the label rules model is not something I don't fully understand yet...
            # rn this just says f-it let's make a list of json blobs we can recover and store it.
            action_rules=[rule.to_aws_json() for rule in action_message.action_rules],
        ).write_to_table(records_table)

    return {"action_performed": "true"}


if __name__ == "__main__":
    lambda_init_once()

    banked_signals = [
        BankedSignal("2862392437204724", "bank 4", "te"),
        BankedSignal("4194946153908639", "bank 4", "te"),
    ]
    match_message = MatchMessage("key", "hash", banked_signals)

    action_message = ActionMessage(
        "key",
        "hash",
        matching_banked_signals=banked_signals,
        action_label=ActionLabel("EnqueForReview"),
    )
    event = {"Records": [{"body": action_message.to_aws_json()}]}
    lambda_handler(event, None)