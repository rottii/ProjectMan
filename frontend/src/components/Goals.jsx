import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import GoalDetail from './GoalDetail';
import { apiFetch } from '../api';
import './Goals.css';
import UserAvatar from './UserAvatar';
export default function Goals({
  token,
  user,
  setActiveView
}) {
  const {
    t
  } = useTranslation();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState(null);

  // Create Goal Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalLevel, setNewGoalLevel] = useState('Company');
  const fetchGoals = async () => {
    try {
      const res = await apiFetch('/api/goals', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setGoals(data);
      }
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchGoals();
  }, [token]);
  const handleCreateGoal = async e => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    try {
      const res = await apiFetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newGoalTitle,
          level: newGoalLevel,
          status: 'On track',
          metricType: 'Percentage',
          currentValue: 0,
          targetValue: 100
        })
      });
      if (res.ok) {
        const created = await res.json();
        setGoals([created, ...goals]);
        setNewGoalTitle('');
        setShowCreateModal(false);
        setSelectedGoal(created); // Automatically open the new goal
      }
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
  };
  if (selectedGoal) {
    return <GoalDetail goal={selectedGoal} token={token} onBack={() => {
      setSelectedGoal(null);
      fetchGoals(); // Refresh the list when coming back
    }} />;
  }
  const companyGoals = goals.filter(g => g.level === 'Company');
  const teamGoals = goals.filter(g => g.level === 'Team');
  const renderGoalCard = goal => {
    const progress = goal.targetValue > 0 ? goal.currentValue / goal.targetValue * 100 : 0;
    const cappedProgress = Math.min(Math.max(progress, 0), 100);
    let statusColor = 'var(--accent-success)'; // On track - Green
    if (goal.status === 'At risk') statusColor = 'var(--accent-warning)'; // Yellow
    if (goal.status === 'Off track') statusColor = 'var(--accent-danger)'; // Red

    return <div key={goal.id} className="goal-card" onClick={() => setSelectedGoal(goal)}>
        <div className="goal-card-header">
          <div className="goal-card-icon" style={{
          backgroundColor: statusColor
        }}>🎯</div>
          <h3 className="goal-card-title">{goal.title}</h3>
        </div>
        
        <div className="goal-card-body">
          <div className="goal-card-status" style={{
          color: statusColor,
          backgroundColor: `${statusColor}15`
        }}>
            {goal.status}
          </div>
          {goal.timePeriod && <div className="goal-card-period">{goal.timePeriod}</div>}
        </div>

        <div className="goal-card-footer">
          <div className="goal-progress-wrapper">
            <div className="goal-progress-bar">
              <div className="goal-progress-fill" style={{
              width: `${cappedProgress}%`,
              backgroundColor: statusColor
            }}></div>
            </div>
            <span className="goal-progress-text">{Math.round(cappedProgress)}%</span>
          </div>
          <div title={goal.owner?.name}>
            <UserAvatar name={goal.owner?.name} userId={goal.owner?.id} profilePhoto={goal.owner?.profilePhoto} size={24} />
          </div>
        </div>
      </div>;
  };
  return <div className="goals-container">
      <div className="goals-header">
        <div className="goals-header-left">
          <div className="goals-header-icon">🎯</div>
          <h1 className="goals-page-title">{t("goals", "Goals")}</h1>
        </div>
        <div className="goals-header-right">
          <button className="add-goal-btn" onClick={() => setShowCreateModal(true)}>{t("add_goal", "+ Add Goal")}</button>
        </div>
      </div>

      <div className="goals-content">
        {loading ? <div className="goals-loading">{t("loading_goals", "Loading goals...")}</div> : <>
            <div className="goals-section">
              <h2 className="goals-section-title">{t("company_goals", "Company Goals")}</h2>
              <p className="goals-section-desc">{t("high_level_objectives_that_guide_the_entire_organi", "High-level objectives that guide the entire organization.")}</p>
              
              {companyGoals.length === 0 ? <div className="goals-empty">{t("no_company_goals_yet", "No company goals yet.")}</div> : <div className="goals-grid">
                  {companyGoals.map(renderGoalCard)}
                </div>}
            </div>

            <div className="goals-divider"></div>

            <div className="goals-section">
              <h2 className="goals-section-title">{t("team_goals", "Team Goals")}</h2>
              <p className="goals-section-desc">{t("specific_objectives_owned_by_individual_teams_or_g", "Specific objectives owned by individual teams or groups.")}</p>
              
              {teamGoals.length === 0 ? <div className="goals-empty">{t("no_team_goals_yet", "No team goals yet.")}</div> : <div className="goals-grid">
                  {teamGoals.map(renderGoalCard)}
                </div>}
            </div>
          </>}
      </div>

      {showCreateModal && <div className="goal-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="goal-modal" onClick={e => e.stopPropagation()}>
            <h2>{t("create_new_goal", "Create new goal")}</h2>
            <form onSubmit={handleCreateGoal}>
              <div className="goal-form-group">
                <label>{t("goal_title", "Goal title")}</label>
                <input type="text" autoFocus value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} placeholder={t("e_g_increase_q3_revenue_by_15", "e.g. Increase Q3 Revenue by 15%")} required />
              </div>
              <div className="goal-form-group">
                <label>{t("goal_level", "Goal level")}</label>
                <select value={newGoalLevel} onChange={e => setNewGoalLevel(e.target.value)}>
                  <option value="Company">{t("company", "Company")}</option>
                  <option value="Team">{t("team", "Team")}</option>
                </select>
              </div>
              <div className="goal-modal-actions">
                <button type="button" className="goal-btn-cancel" onClick={() => setShowCreateModal(false)}>{t("cancel", "Cancel")}</button>
                <button type="submit" className="goal-btn-submit" disabled={!newGoalTitle.trim()}>{t("create_goal", "Create Goal")}</button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
}