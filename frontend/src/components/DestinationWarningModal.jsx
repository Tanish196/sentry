import React from 'react';
import Button from './ui/button/Button';

const DestinationWarningModal = ({ zone, onClose, onProceed }) => {
  const { name, safety_score, risk_level } = zone.properties;

  const handleProceed = () => {
    // Log consent
    console.log('User consent logged for proceeding to high-risk destination:', {
      zoneId: zone.properties.id,
      zoneName: name,
      safetyScore: safety_score,
      timestamp: new Date().toISOString(),
      userAction: 'proceed_to_forbidden_zone'
    });

    onProceed();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content warning-modal">
        <div className="modal-header">
          <h2>⚠️ High-Risk Destination Warning</h2>
        </div>

        <div className="modal-body">
          <div className="warning-icon">
            🚫
          </div>

          <div className="warning-details">
            <p className="warning-message">
              Your destination is located in a <strong>high-risk safety zone</strong>.
            </p>

            <div className="zone-info">
              <h3>Zone Details:</h3>
              <ul>
                <li><strong>Name:</strong> {name}</li>
                <li><strong>Safety Score:</strong> {(safety_score * 100).toFixed(1)}%</li>
                <li><strong>Risk Level:</strong>
                  <span className="risk-badge forbidden">
                    {risk_level.toUpperCase()}
                  </span>
                </li>
              </ul>
            </div>

            <div className="warning-text">
              <p>
                This area has been identified as having significant safety concerns based on
                crime data, accident reports, and other risk factors. Proceeding with this route
                is not recommended.
              </p>

              <p className="consent-note">
                By proceeding, you acknowledge the risks and take full responsibility for your safety.
                Your consent will be logged for safety tracking purposes.
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <Button onClick={onClose} className="secondary-button">
            Cancel Route
          </Button>
          <Button onClick={handleProceed} className="danger-button">
            Proceed (I Know the Risk)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DestinationWarningModal;
