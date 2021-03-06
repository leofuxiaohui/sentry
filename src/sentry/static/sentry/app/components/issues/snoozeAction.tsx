import React from 'react';
import {Modal} from 'react-bootstrap';
import PropTypes from 'prop-types';

import {t} from 'app/locale';

enum SnoozeTimes {
  // all values in minutes
  THIRTY_MINUTES = 30,
  TWO_HOURS = 60 * 2,
  TWENTY_FOUR_HOURS = 60 * 24,
}

type SnoozeActionProps = {
  disabled: boolean;
  tooltip: string;
  onSnooze: (duration: SnoozeTimes) => {};
  className?: string;
};

class SnoozeAction extends React.Component<SnoozeActionProps> {
  static propTypes = {
    disabled: PropTypes.bool,
    onSnooze: PropTypes.func.isRequired,
    tooltip: PropTypes.string,
  };

  state = {
    isModalOpen: false,
  };

  toggleModal = () => {
    if (this.props.disabled) {
      return;
    }
    this.setState({
      isModalOpen: !this.state.isModalOpen,
    });
  };

  closeModal = () => {
    this.setState({isModalOpen: false});
  };

  onSnooze = (duration: SnoozeTimes) => {
    this.props.onSnooze(duration);
    this.closeModal();
  };

  render() {
    return (
      <React.Fragment>
        <a
          title={this.props.tooltip}
          className={this.props.className}
          onClick={this.toggleModal}
        >
          <span>{t('zZz')}</span>
        </a>
        <Modal
          show={this.state.isModalOpen}
          title={t('Please confirm')}
          animation={false}
          onHide={this.closeModal}
          bsSize="sm"
        >
          <Modal.Body>
            <h5>{t('How long should we ignore this issue?')}</h5>
            <ul className="nav nav-stacked nav-pills">
              <li>
                <a onClick={this.onSnooze.bind(this, SnoozeTimes.THIRTY_MINUTES)}>
                  {t('30 minutes')}
                </a>
              </li>
              <li>
                <a onClick={this.onSnooze.bind(this, SnoozeTimes.TWO_HOURS)}>
                  {t('2 hours')}
                </a>
              </li>
              <li>
                <a onClick={this.onSnooze.bind(this, SnoozeTimes.TWENTY_FOUR_HOURS)}>
                  {t('24 hours')}
                </a>
              </li>
              {/* override click event object w/ undefined to indicate "no duration" */}
              <li>
                <a onClick={this.onSnooze.bind(this, undefined)}>{t('Forever')}</a>
              </li>
            </ul>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-default" onClick={this.closeModal}>
              {t('Cancel')}
            </button>
          </Modal.Footer>
        </Modal>
      </React.Fragment>
    );
  }
}

export default SnoozeAction;
