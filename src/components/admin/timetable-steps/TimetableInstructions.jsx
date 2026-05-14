import React from 'react';
import { 
  Info, 
  Clock, 
  Users, 
  BookOpen, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  Lightbulb
} from 'lucide-react';
import './TimetableSteps.css';

export function TimetableInstructions({ onComplete, onNext, isFirstStep }) {
  const instructions = [
    {
      icon: Info,
      title: "Timetable Code First",
      content: "Your timetable code is generated in the first step (Basic Info). Share it with students and faculty early—inspired by TimetableMaster's approach."
    },
    {
      icon: Users,
      title: "Faculty Preferences",
      content: "Faculty set preferred/avoided time slots. The generator respects these when possible. Ensure faculty complete preferences before generation."
    },
    {
      icon: BookOpen,
      title: "Section Allocation",
      content: "Each section = Subject + Faculty + Room + Class. You can assign multiple faculty per subject for substitution or shared teaching."
    },
    {
      icon: Clock,
      title: "Schedule Flexibility",
      content: "Define periods and breaks per day. The algorithm handles conflicts, room utilization, and consecutive lab periods automatically."
    }
  ];

  const considerations = [
    "Lab sessions typically need 2-3 consecutive periods",
    "Large batches may need to be split into multiple groups for labs",
    "Some subjects can be combined across different batches",
    "Consider faculty workload distribution",
    "Account for room availability and capacity",
    "Plan for break times and lunch periods"
  ];

  const handleContinue = () => {
    // Mark instructions as read
    onComplete({ instructionsRead: true, timestamp: Date.now() });
  };

  return (
    <div className="timetable-step">
      <div className="step-header">
        <div className="step-icon-wrapper">
          <Info className="step-main-icon" />
        </div>
        <div className="step-title-section">
          <h2>Important Instructions</h2>
          <p>Please read these guidelines before proceeding with timetable creation</p>
        </div>
      </div>

      <div className="instructions-content">
        <div className="instructions-grid">
          {instructions.map((instruction, index) => {
            const IconComponent = instruction.icon;
            return (
              <div key={index} className="instruction-card">
                <div className="instruction-icon">
                  <IconComponent />
                </div>
                <div className="instruction-content">
                  <h3>{instruction.title}</h3>
                  <p>{instruction.content}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="considerations-section">
          <div className="considerations-header">
            <Lightbulb className="considerations-icon" />
            <h3>Important Considerations</h3>
          </div>
          <div className="considerations-list">
            {considerations.map((consideration, index) => (
              <div key={index} className="consideration-item">
                <CheckCircle className="consideration-check" />
                <span>{consideration}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="warning-box">
          <AlertTriangle className="warning-icon" />
          <div className="warning-content">
            <h4>Before You Begin</h4>
            <p>
              Ensure you have all necessary information ready: faculty details, room information, 
              subject lists, and preferred timing schedules. This will help you complete the setup 
              process smoothly.
            </p>
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button 
          className="btn btn-primary btn-continue"
          onClick={handleContinue}
        >
          I Understand, Continue
          <ArrowRight className="btn-icon-right" />
        </button>
      </div>
    </div>
  );
}