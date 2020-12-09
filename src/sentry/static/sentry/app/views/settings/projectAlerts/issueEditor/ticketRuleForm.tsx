import React from 'react';
import {Modal} from 'react-bootstrap';
import styled from '@emotion/styled';
import debounce from 'lodash/debounce';
import * as queryString from 'query-string';

import {addSuccessMessage} from 'app/actionCreators/indicator';
import Button from 'app/components/button';
import AbstractExternalIssueForm from 'app/components/externalIssues/abstractExternalIssueForm';
import ExternalLink from 'app/components/links/externalLink';
import {IconSettings} from 'app/icons';
import {t, tct} from 'app/locale';
import space from 'app/styles/space';
import {IssueConfigField, Organization} from 'app/types';
import {IssueAlertRuleAction, IssueAlertRuleCondition} from 'app/types/alerts';
import AsyncView from 'app/views/asyncView';
import Form from 'app/views/settings/components/forms/form';
import {FormField} from 'app/views/settings/projectAlerts/issueEditor/ruleNode';

type Props = {
  formFields: {[key: string]: any};
  index: number;
  instance: IssueAlertRuleAction | IssueAlertRuleCondition;
  link?: string;
  onPropertyChange: (rowIndex: number, name: string, value: string) => void;
  onSubmitAction: (data: {[key: string]: string}) => void;
  organization: Organization;
  ticketType?: string;
} & AbstractExternalIssueForm['props'];

type State = {
  showModal: boolean;
} & AbstractExternalIssueForm['state'];

class TicketRuleForm extends AbstractExternalIssueForm<Props, State> {
  constructor(props: Props, context: any) {
    super(props, context);
  }

  getDefaultState(): State {
    return {
      ...super.getDefaultState(),
      showModal: false,
      action: 'create',
      dynamicFieldValues: {},
    };
  }

  getEndpoints(): ReturnType<AsyncView['getEndpoints']> {
    const {instance, organization} = this.props;
    return [
      [
        'integrationDetails',
        `/organizations/${organization.slug}/integrations/${instance.integration}/?action=create`,
      ],
    ];
  }

  openModal = (event: React.MouseEvent) => {
    event.preventDefault();
    this.setState({
      showModal: true,
    });
  };

  closeModal = () => {
    this.setState({
      showModal: false,
    });
  };

  getNames = (): string[] => {
    const names: string[] = [];
    for (const name in this.props.formFields) {
      if (this.props.formFields[name].hasOwnProperty('name')) {
        names.push(this.props.formFields[name].name);
      }
    }
    return names;
  };

  getEndPointString = () => {
    const {instance, organization} = this.props;
    return `/organizations/${organization.slug}/integrations/${instance.integration}/`;
  };

  cleanData = (data: {
    [key: string]: string;
  }): {
    integration?: string | number;
    [key: string]: any;
  } => {
    const names: string[] = this.getNames();
    const formData: {
      integration?: string | number;
      [key: string]: any;
    } = {};
    if (this.props.instance?.hasOwnProperty('integration')) {
      formData.integration = this.props.instance?.integration;
    }
    for (const [key, value] of Object.entries(data)) {
      if (names.includes(key)) {
        formData[key] = value;
      }
    }
    return formData;
  };

  // @ts-ignore success and error are not used
  onFormSubmit = (data, _success, _error, e) => {
    e.preventDefault();
    e.stopPropagation();

    const formData = this.cleanData(data);
    this.props.onSubmitAction(formData);
    addSuccessMessage(t('Changes applied.'));
    this.closeModal();
  };

  getOptions = (field: IssueConfigField, input: string) =>
    new Promise((resolve, reject) => {
      if (!input) {
        const choices =
          (field.choices as Array<[number | string, number | string]>) || [];
        const options = choices.map(([value, label]) => ({value, label}));
        return resolve({options});
      }
      return this.debouncedOptionLoad(field, input, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

  debouncedOptionLoad = debounce(
    async (
      field: IssueConfigField,
      input: string,
      cb: (err: Error | null, result?) => void
    ) => {
      const options = this.props.instance;
      const query = queryString.stringify({
        project: options?.project,
        issuetype: options?.issuetype,
        field: field.name,
        query: input,
      });

      const url = field.url || '';
      const separator = url.includes('?') ? '&' : '?';
      // We can't use the API client here since the URL is not scoped under the
      // API endpoints (which the client prefixes)
      try {
        const response = await fetch(url + separator + query);
        cb(null, {options: response.ok ? await response.json() : []});
      } catch (err) {
        cb(err);
      }
    },
    200,
    {trailing: true}
  );

  getFormProps = (): Form['props'] => {
    return {
      ...this.getDefaultFormProps(),
      cancelLabel: t('Close'),
      onCancel: this.closeModal,
      onSubmit: this.onFormSubmit,
      submitLabel: t('Apply Changes'),
    };
  };

  getFieldProps = (field: IssueConfigField) =>
    field.url
      ? {
          loadOptions: (input: string) => this.getOptions(field, input),
          async: true,
          cache: false,
          onSelectResetsInput: false,
          onCloseResetsInput: false,
          onBlurResetsInput: false,
          autoload: true,
        }
      : {};

  addFields = (formFields: FormField[]): void => {
    const title = {
      name: 'title',
      label: 'Title',
      type: 'string',
      default: 'This will be the same as the Sentry Issue.',
      disabled: true,
    };
    const description = {
      name: 'description',
      label: 'Description',
      type: 'string',
      default: 'This will be generated from the Sentry Issue details.',
      disabled: true,
    };
    formFields.unshift(description);
    formFields.unshift(title);
  };

  renderBodyText = () => {
    const {ticketType, link} = this.props;
    return (
      <BodyText>
        {t(
          'When this alert is triggered a %s will be created with the following fields. ',
          ticketType
        )}
        {tct("It'll also [linkToDocs] with the new Sentry Issue.", {
          linkToDocs: <ExternalLink href={link}>{t('stay in sync')}</ExternalLink>,
        })}
      </BodyText>
    );
  };

  render() {
    const {formFields, instance} = this.props;
    const cleanFormFields = Object.values(formFields);
    this.addFields(cleanFormFields);
    return (
      <React.Fragment>
        <Button
          size="small"
          icon={<IconSettings size="xs" />}
          onClick={event => this.openModal(event)}
        >
          Issue Link Settings
        </Button>
        <Modal
          show={this.state.showModal}
          onHide={this.closeModal}
          animation={false}
          enforceFocus={false}
          backdrop="static"
        >
          {this.renderForm(cleanFormFields, instance)}
        </Modal>
      </React.Fragment>
    );
  }
}

const BodyText = styled('div')`
  margin-bottom: ${space(3)};
`;

export default TicketRuleForm;
