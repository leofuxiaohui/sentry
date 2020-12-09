import React from 'react';
import * as Sentry from '@sentry/react';
import PropTypes from 'prop-types';

import {addSuccessMessage} from 'app/actionCreators/indicator';
import AsyncComponent from 'app/components/asyncComponent';
import AbstractExternalIssueForm from 'app/components/externalIssues/abstractExternalIssueForm';
import NavTabs from 'app/components/navTabs';
import {t} from 'app/locale';
import SentryTypes from 'app/sentryTypes';
import {Group, Integration, IntegrationExternalIssue, IssueConfigField} from 'app/types';
import Form from 'app/views/settings/components/forms/form';
import {FieldValue} from 'app/views/settings/components/forms/model';

const MESSAGES_BY_ACTION = {
  link: t('Successfully linked issue.'),
  create: t('Successfully created issue.'),
};

const SUBMIT_LABEL_BY_ACTION = {
  link: t('Link Issue'),
  create: t('Create Issue'),
};

type Props = {
  group: Group;
  integration: Integration;
  onSubmitSuccess: (
    externalIssue: IntegrationExternalIssue,
    onSuccess: () => void
  ) => void;
} & AbstractExternalIssueForm['props'];

type State = {
  dynamicFieldValues: {[key: string]: FieldValue};
} & AbstractExternalIssueForm['state'];

class ExternalIssueForm extends AbstractExternalIssueForm<Props, State> {
  loadTransaction?: ReturnType<typeof Sentry.startTransaction>;
  submitTransaction?: ReturnType<typeof Sentry.startTransaction>;
  constructor(props: Props, context: any) {
    super(props, context);
  }

  static propTypes = {
    group: SentryTypes.Group.isRequired,
    integration: PropTypes.object.isRequired,
    action: PropTypes.oneOf(['link', 'create']),
    onSubmitSuccess: PropTypes.func.isRequired,
  };

  startTransaction = (type: 'load' | 'submit') => {
    const {group, integration} = this.props;
    const {action} = this.state;
    const transaction = Sentry.startTransaction({name: `externalIssueForm.${type}`});
    transaction.setTag('issueAction', action);
    transaction.setTag('groupID', group.id);
    transaction.setTag('projectID', group.project.id);
    transaction.setTag('integrationSlug', integration.provider.slug);
    transaction.setTag('integrationType', 'firstParty');
    return transaction;
  };

  componentDidMount() {
    this.loadTransaction = this.startTransaction('load');
  }

  getEndpoints = (): ReturnType<AsyncComponent['getEndpoints']> => {
    const {group, integration} = this.props;
    const {action} = this.state;
    return [
      [
        'integrationDetails',
        `/groups/${group.id}/integrations/${integration.id}/?action=${action}`,
      ],
    ];
  };

  handlePreSubmit = () => {
    this.submitTransaction = this.startTransaction('submit');
  };

  onSubmitSuccess = (data: IntegrationExternalIssue): void => {
    const {action} = this.state;
    this.props.onSubmitSuccess(data, () => addSuccessMessage(MESSAGES_BY_ACTION[action]));
    this.submitTransaction?.finish();
  };

  handleSubmitError = () => {
    this.submitTransaction?.finish();
  };

  onLoadAllEndpointsSuccess() {
    this.loadTransaction?.finish();
  }

  onRequestError = () => {
    this.loadTransaction?.finish();
  };

  getEndPointString = () => {
    const {group, integration} = this.props;
    return `/groups/${group.id}/integrations/${integration.id}/`;
  };

  getFormProps = (): Form['props'] => {
    const {action} = this.state;
    return {
      ...this.getDefaultFormProps(),
      submitLabel: SUBMIT_LABEL_BY_ACTION[action],
      apiEndpoint: this.getEndPointString(),
      apiMethod: action === 'create' ? 'POST' : 'PUT',
      onPreSubmit: this.handlePreSubmit,
      onSubmitError: this.handleSubmitError,
      onSubmitSuccess: this.onSubmitSuccess,
    };
  };

  renderNavTabs = () => {
    const {action} = this.state;
    return (
      <NavTabs underlined>
        <li className={action === 'create' ? 'active' : ''}>
          <a onClick={() => this.handleClick('create')}>{t('Create')}</a>
        </li>
        <li className={action === 'link' ? 'active' : ''}>
          <a onClick={() => this.handleClick('link')}>{t('Link')}</a>
        </li>
      </NavTabs>
    );
  };

  renderBody() {
    const {integrationDetails} = this.state;
    const config: IssueConfigField[] = integrationDetails[this.getConfigName()];
    return this.renderForm(config);
  }
}

export default ExternalIssueForm;
