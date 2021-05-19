/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved
 */

import React, {useState, useEffect} from 'react';
import {useHistory, useParams} from 'react-router-dom';
import {Col, Row, Table, Button} from 'react-bootstrap';

import {
  fetchHash,
  fetchImage,
  fetchContentActionHistory,
  fetchContentDetails,
} from '../Api';
import {CopyableHashField} from '../utils/TextFieldsUtils';
import {formatTimestamp} from '../utils/DateTimeUtils';
import {BlurUntilHoverImage} from '../utils/ImageUtils';
import ContentMatchTable from '../components/ContentMatchTable';
import FixedWidthCenterAlignedLayout from './layouts/FixedWidthCenterAlignedLayout';

export default function ContentDetails() {
  const history = useHistory();
  const {id} = useParams();
  const [contentDetails, setContentDetails] = useState(null);
  const [actionHistory, setActionHistory] = useState([]);
  const [hashDetails, setHashDetails] = useState(null);
  const [img, setImage] = useState(null);

  useEffect(() => {
    fetchHash(id).then(hash => {
      setHashDetails(hash);
    });
  }, []);

  useEffect(() => {
    fetchImage(id).then(result => {
      setImage(URL.createObjectURL(result));
    });
  }, []);

  // TODO fetch actions once endpoint exists
  useEffect(() => {
    fetchContentActionHistory(id).then(result => {
      if (result && result.action_history) {
        setActionHistory(result.action_history);
      }
    });
  }, []);

  useEffect(() => {
    fetchContentDetails(id).then(result => {
      setContentDetails(result);
    });
  }, []);

  return (
    <FixedWidthCenterAlignedLayout title="Summary">
      <Row>
        <Col className="mb-4">
          <Button variant="link" href="#" onClick={() => history.goBack()}>
            &larr; Back
          </Button>
        </Col>
      </Row>
      <Row
        style={{
          minHeight: '450px',
        }}>
        <Col md={6}>
          <h3>Content Details</h3>
          <Table>
            <tbody>
              <tr>
                <td>Content ID:</td>
                <td>{id}</td>
              </tr>
              <tr>
                <td>Last Submitted:</td>
                <td>
                  {contentDetails && contentDetails.updated_at
                    ? formatTimestamp(contentDetails.updated_at)
                    : 'Unknown'}
                </td>
              </tr>
              <tr>
                <td>Additional Fields:</td>
                <td>
                  {contentDetails && contentDetails.additional_fields
                    ? contentDetails.additional_fields.join(', ')
                    : 'No additional fields provided'}
                </td>
              </tr>
              <td className="pb-0" colSpan={2}>
                <h4>Action History</h4>
              </td>
              <tr>
                <td>Record:</td>
                <td>
                  {actionHistory.length
                    ? actionHistory[0].action_label
                    : 'No actions performed'}
                </td>
              </tr>
              <td className="pb-0" colSpan={2}>
                <h4>Hash Details</h4>
              </td>
              <tr>
                <td>Content Hash:</td>
                <CopyableHashField
                  text={
                    hashDetails
                      ? hashDetails.content_hash ?? 'Not found'
                      : 'loading...'
                  }
                />
              </tr>
              <tr>
                <td>Last Hashed on:</td>
                <td>
                  {hashDetails
                    ? formatTimestamp(hashDetails.updated_at)
                    : 'loading...'}
                </td>
              </tr>
            </tbody>
          </Table>
        </Col>
        <Col className="pt-4" md={6}>
          <BlurUntilHoverImage src={img} />
        </Col>
      </Row>
      <ContentMatchTable contentKey={id} />
    </FixedWidthCenterAlignedLayout>
  );
}