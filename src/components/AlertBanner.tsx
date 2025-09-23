import React, { useState } from 'react';
import { useAlerts } from '../hooks/useAlerts';
import { AlertSeverity, AlertStatus, getAlertIcon, getAlertColor } from '../utils/alertSystem';
import Button from './Button';

const AlertBanner: React.FC = () => {
  const { alerts, acknowledgeAlert, resolveAlert, dismissAlert } = useAlerts();
  const [isExpanded, setIsExpanded] = useState(false);

  // Get active alerts sorted by severity
  const activeAlerts = alerts
    .filter(alert => alert.status === AlertStatus.ACTIVE)
    .sort((a, b) => {
      const severityOrder = {
        [AlertSeverity.CRITICAL]: 4,
        [AlertSeverity.HIGH]: 3,
        [AlertSeverity.MEDIUM]: 2,
        [AlertSeverity.LOW]: 1,
      };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

  if (activeAlerts.length === 0) {
    return null;
  }

  const topAlert = activeAlerts[0];
  const remainingCount = activeAlerts.length - 1;

  const getSeverityColors = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return {
          bg: 'bg-red-100 border-red-300',
          text: 'text-red-900',
          button: 'text-red-700 hover:text-red-900',
          accent: 'text-red-600',
        };
      case AlertSeverity.HIGH:
        return {
          bg: 'bg-orange-100 border-orange-300',
          text: 'text-orange-900',
          button: 'text-orange-700 hover:text-orange-900',
          accent: 'text-orange-600',
        };
      case AlertSeverity.MEDIUM:
        return {
          bg: 'bg-yellow-100 border-yellow-300',
          text: 'text-yellow-900',
          button: 'text-yellow-700 hover:text-yellow-900',
          accent: 'text-yellow-600',
        };
      default:
        return {
          bg: 'bg-blue-100 border-blue-300',
          text: 'text-blue-900',
          button: 'text-blue-700 hover:text-blue-900',
          accent: 'text-blue-600',
        };
    }
  };

  const colors = getSeverityColors(topAlert.severity);

  return (
    <div className={`border-l-4 border-t ${colors.bg} ${colors.text} p-4 mb-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="text-xl">
            {getAlertIcon(topAlert.type)}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium">{topAlert.title}</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded uppercase ${colors.accent} bg-white bg-opacity-70`}>
                {topAlert.severity}
              </span>
            </div>
            
            <p className="text-sm mt-1">{topAlert.message}</p>
            
            {topAlert.details && Object.keys(topAlert.details).length > 0 && (
              <div className="mt-2 text-xs">
                {Object.entries(topAlert.details).map(([key, value]) => (
                  <div key={key} className="flex space-x-2">
                    <span className="font-medium">{key}:</span>
                    <span>
                      {typeof value === 'object' 
                        ? `${(value as any).currentValue} ${(value as any).operator} ${(value as any).threshold}`
                        : String(value)
                      }
                    </span>
                  </div>
                ))}
              </div>
            )}

            {remainingCount > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`mt-2 text-sm underline ${colors.button} focus:outline-none`}
              >
                {isExpanded ? 'Hide' : 'Show'} {remainingCount} more alert{remainingCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2 ml-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => acknowledgeAlert(topAlert.id)}
            className="text-xs"
          >
            ✓ Acknowledge
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => resolveAlert(topAlert.id)}
            className="text-xs"
          >
            ✓ Resolve
          </Button>
          
          <button
            onClick={() => dismissAlert(topAlert.id)}
            className={`${colors.button} hover:bg-white hover:bg-opacity-20 p-1 rounded focus:outline-none`}
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded alerts */}
      {isExpanded && remainingCount > 0 && (
        <div className="mt-4 space-y-3 border-t pt-3 border-white border-opacity-30">
          {activeAlerts.slice(1).map(alert => {
            const alertColors = getSeverityColors(alert.severity);
            
            return (
              <div key={alert.id} className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="text-lg">
                    {getAlertIcon(alert.type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-sm">{alert.title}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded uppercase ${alertColors.accent} bg-white bg-opacity-70`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs mt-1">{alert.message}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="text-xs px-2 py-1"
                  >
                    ✓
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                    className="text-xs px-2 py-1"
                  >
                    ✓
                  </Button>
                  
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className={`${colors.button} hover:bg-white hover:bg-opacity-20 p-1 rounded focus:outline-none`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Time indicator */}
      <div className="mt-3 text-xs opacity-75">
        Triggered: {topAlert.triggeredAt.toLocaleString()}
      </div>
    </div>
  );
};

export default AlertBanner;
