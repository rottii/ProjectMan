import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import UserAvatar from './UserAvatar';
import { apiFetch } from '../api';
export default function Portfolios({
  portfolios = [],
  setPortfolios,
  token,
  setActiveView,
  setSelectedPortfolio,
  portfolioCreationParent,
  setPortfolioCreationParent,
  activeWorkspaceId
}) {
  const {
    t
  } = useTranslation();
  const [activeTab, setActiveTab] = useState('Recent and starred');
  const [creationStep, setCreationStep] = useState(0); // 0 = list, 1 = create step 1, 2 = create step 2

  useEffect(() => {
    if (portfolioCreationParent) {
      setCreationStep(1);
    }
  }, [portfolioCreationParent]);

  // Step 1 states
  const [portfolioName, setPortfolioName] = useState('portfolio');
  const [privacy, setPrivacy] = useState('Public to My workspace');
  const [shareAccess, setShareAccess] = useState('Share project access manually');
  const [defaultView, setDefaultView] = useState('List');

  // Step 2 states
  const [nextAction, setNextAction] = useState('projects'); // 'projects' or 'share'
  const [createdPortfolio, setCreatedPortfolio] = useState(null);
  if (creationStep === 1) {
    return <div style={styles.creationContainer}>
        <div style={styles.creationHeader}>
          <button style={styles.backBtn} onClick={() => setCreationStep(0)}>←</button>
        </div>
        <div style={styles.creationContent}>
          <h1 style={styles.creationTitle}>{t("new_portfolio", "New portfolio")}</h1>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>{t("portfolio_name", "Portfolio name")}</label>
            <input style={styles.formInput} value={portfolioName} onChange={e => setPortfolioName(e.target.value)} />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>{t("privacy", "Privacy")}</label>
            <select style={styles.formSelect} value={privacy} onChange={e => setPrivacy(e.target.value)}>
              <option>{t("public_to_my_workspace", "Public to My workspace")}</option>
              <option>{t("private_to_portfolio_members", "Private to portfolio members")}</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <div style={styles.labelRow}>
              <label style={styles.formLabel}>{t("share_project_access_with_portfolio_members", "Share project access with portfolio members")}</label>
              <a href="#" style={styles.learnMore}>{t("learn_more", "Learn more")}</a>
            </div>
            <select style={styles.formSelect} value={shareAccess} onChange={e => setShareAccess(e.target.value)}>
              <option>{t("share_project_access_manually", "Share project access manually")}</option>
              <option>{t("share_project_access_by_default", "Share project access by default")}</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>{t("default_view", "Default view")}</label>
            <div style={styles.viewCardsGrid}>
              <div style={{
              ...styles.viewCard,
              ...(defaultView === 'List' ? styles.viewCardSelected : {})
            }} onClick={() => setDefaultView('List')}>
                <div style={styles.viewCardIcon}>
                  <div style={defaultView === 'List' ? styles.iconBlue : styles.iconGray}>
                    <div style={styles.fakeListRow}></div>
                    <div style={styles.fakeListRow}></div>
                  </div>
                </div>
                <div style={styles.viewCardText}>{t("list", "List")}</div>
              </div>

              <div style={{
              ...styles.viewCard,
              ...(defaultView === 'Timeline' ? styles.viewCardSelected : {})
            }} onClick={() => setDefaultView('Timeline')}>
                <div style={styles.viewCardIcon}>
                  <div style={defaultView === 'Timeline' ? styles.iconBlue : styles.iconGray}>
                    <div style={styles.fakeTimeline}></div>
                  </div>
                </div>
                <div style={styles.viewCardText}>{t("timeline", "Timeline")}</div>
              </div>

              <div style={{
              ...styles.viewCard,
              ...(defaultView === 'Workload' ? styles.viewCardSelected : {})
            }} onClick={() => setDefaultView('Workload')}>
                <div style={styles.viewCardIcon}>
                  <div style={defaultView === 'Workload' ? styles.iconBlue : styles.iconGray}>
                    <div style={styles.fakeWorkload}></div>
                  </div>
                </div>
                <div style={styles.viewCardText}>{t("workload", "Workload")}</div>
              </div>
            </div>
          </div>

          <button style={styles.continueBtn} onClick={() => {
          apiFetch('/api/portfolios', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: portfolioName,
              privacy,
              defaultView,
              workspaceId: activeWorkspaceId
            })
          }).then(res => res.json()).then(data => {
            if (data.id) {
              setPortfolios([data, ...portfolios]);
              setCreatedPortfolio(data);
              if (portfolioCreationParent) {
                apiFetch(`/api/portfolios/${portfolioCreationParent}/portfolios`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    childPortfolioId: data.id
                  })
                }).then(res => res.json()).then(() => {
                  if (setPortfolioCreationParent) setPortfolioCreationParent(null);
                  setCreationStep(2);
                }).catch(err => {
                  console.error(err);
                  if (setPortfolioCreationParent) setPortfolioCreationParent(null);
                  setCreationStep(2);
                });
              } else {
                setCreationStep(2);
              }
            }
          }).catch(err => console.error(err));
        }}>{t("continue", "Continue")}</button>
        </div>
      </div>;
  }
  if (creationStep === 2) {
    return <div style={styles.creationContainer}>
        <div style={styles.creationHeader}>
          <button style={styles.backBtn} onClick={() => setCreationStep(1)}>←</button>
        </div>
        <div style={styles.creationContent}>
          <h1 style={styles.creationTitleCenter}>{t("what_do_you_want_to_do_first", "What do you want to do first?")}</h1>

          <div style={{
          ...styles.actionCard,
          ...(nextAction === 'projects' ? styles.actionCardSelected : {})
        }} onClick={() => setNextAction('projects')}>
            <div style={styles.actionIconCircle}>+</div>
            <div>
              <div style={styles.actionCardTitle}>{t("start_adding_projects", "Start adding projects")}</div>
              <div style={styles.actionCardSub}>{t("add_projects_and_track_their_progress", "Add projects and track their progress")}</div>
            </div>
          </div>

          <div style={{
          ...styles.actionCard,
          ...(nextAction === 'share' ? styles.actionCardSelected : {})
        }} onClick={() => setNextAction('share')}>
            <div style={styles.actionIconUsers}>👥</div>
            <div>
              <div style={styles.actionCardTitle}>{t("share_with_teammates", "Share with teammates")}</div>
              <div style={styles.actionCardSub}>{t("invite_teammates_to_collaborate", "Invite teammates to collaborate")}</div>
            </div>
          </div>

          <button style={styles.continueBtn} onClick={() => {
          setCreationStep(0);
          setSelectedPortfolio(createdPortfolio);
          setActiveView('portfolio_detail');
        }}>{t("go_to_portfolio", "Go to portfolio")}</button>
        </div>
      </div>;
  }
  return <div className="browse-projects-container">
      <div className="browse-projects-header">
        <h1>{t("portfolios", "Portfolios")}</h1>
        {activeTab === 'Recent and starred' && <button className="bp-create-btn" onClick={() => setCreationStep(1)}>+ {t("create_portfolio", "Create portfolio")}</button>}
      </div>

      <div className="bp-filters" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '24px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ cursor: 'pointer', fontSize: '14px', color: activeTab === 'Recent and starred' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'Recent and starred' ? '500' : 'normal', borderBottom: activeTab === 'Recent and starred' ? '2px solid var(--text-primary)' : '2px solid transparent', paddingBottom: '12px', marginBottom: '-13px' }} onClick={() => setActiveTab('Recent and starred')}>{t("recent_and_starred", "Recent and starred")}</div>
          <div style={{ cursor: 'pointer', fontSize: '14px', color: activeTab === 'Browse all' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'Browse all' ? '500' : 'normal', borderBottom: activeTab === 'Browse all' ? '2px solid var(--text-primary)' : '2px solid transparent', paddingBottom: '12px', marginBottom: '-13px' }} onClick={() => setActiveTab('Browse all')}>{t("browse_all", "Browse all")}</div>
        </div>

        {activeTab === 'Browse all' && <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="bp-filter-chip">🔍</button>
            <button className="bp-filter-chip">⇅ {t("sort_last_modified_newest", "Sort: Last modified (Newest)")}</button>
            <button className="bp-create-btn" onClick={() => setCreationStep(1)}>+ {t("create_portfolio", "Create portfolio")}</button>
          </div>}
      </div>

      <div className="bp-table">
        <div className="bp-table-header">
          <div className="bp-col-name">{t("name", "Name")}</div>
          <div className="bp-col-members">{t("members", "Members")}</div>
          <div className="bp-col-portfolios">{t("parent_portfolios", "Parent portfolios")}</div>
          <div style={{ width: '120px' }}></div>
        </div>

        <div className="bp-table-body">
          {portfolios.map(portfolio => (
            <div key={portfolio.id} className="bp-table-row" onClick={() => {
              setSelectedPortfolio(portfolio);
              setActiveView('portfolio_detail');
            }}>
              <div className="bp-col-name bp-flex-name">
                <div className="bp-project-icon" style={{ backgroundColor: 'var(--accent-primary)', color: '#FFF' }}>
                  📁
                </div>
                <div className="bp-project-info">
                  <div className="bp-project-title">{portfolio.name}</div>
                  <div className="bp-project-status">{portfolio.projectsCount || 0} {t("projects", "projects")}</div>
                </div>
              </div>
              <div className="bp-col-members">
                 {portfolio.owner && (
                   <UserAvatar name={portfolio.owner.name} userId={portfolio.owner.id} profilePhoto={portfolio.owner.profilePhoto} size={24} />
                 )}
              </div>
              <div className="bp-col-portfolios">
              </div>
              <div style={{ width: '120px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
                <div style={{ color: 'var(--text-tertiary)', fontSize: '16px' }}>☆</div>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer' }}>{t("share", "Share")}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>;
}
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)'
  },
  headerArea: {
    padding: '24px 32px 0 32px',
    borderBottom: '1px solid var(--border-color)'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: '500',
    margin: 0,
    color: 'var(--text-primary)'
  },
  createBtn: {
    padding: '6px 12px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.1s'
  },
  tabsAndActionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  tabsContainer: {
    display: 'flex',
    gap: '24px'
  },
  tab: {
    paddingBottom: '12px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    borderBottom: '2px solid transparent'
  },
  activeTab: {
    color: 'var(--text-primary)',
    fontWeight: '500',
    borderBottom: '2px solid var(--text-primary)'
  },
  browseAllActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    paddingBottom: '8px'
  },
  actionItem: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    cursor: 'pointer'
  },
  contentArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px'
  },
  recentSection: {
    maxWidth: '800px'
  },
  recentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '24px'
  },
  recentTitle: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    fontWeight: '500',
    cursor: 'pointer'
  },
  gridIcon: {
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontSize: '16px'
  },
  gridContainer: {
    display: 'flex',
    gap: '32px'
  },
  newPortfolioCard: {
    width: '140px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer'
  },
  plusIcon: {
    width: '100px',
    height: '100px',
    border: '1px dashed var(--border-color)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: 'var(--text-secondary)'
  },
  newPortfolioText: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    textAlign: 'center'
  },
  portfolioCard: {
    width: '140px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer'
  },
  folderShape: {
    width: '100px',
    height: '80px',
    position: 'relative',
    marginTop: '20px'
  },
  folderTab: {
    width: '40px',
    height: '15px',
    backgroundColor: 'var(--text-tertiary)',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    position: 'absolute',
    top: '-10px',
    left: '0'
  },
  folderBody: {
    width: '100%',
    height: '100%',
    backgroundColor: 'var(--text-tertiary)',
    borderRadius: '8px',
    position: 'absolute',
    top: '0',
    left: '0'
  },
  memberBadge: {
    position: 'absolute',
    bottom: '-10px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#F9A8D4',
    // Pinkish
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 'bold',
    border: '2px solid var(--bg-primary)'
  },
  portfolioName: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    textAlign: 'center',
    marginTop: '4px'
  },
  portfolioSub: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    textAlign: 'center'
  },
  listViewSection: {
    width: '100%'
  },
  listHeader: {
    display: 'flex',
    padding: '0 16px 12px 16px',
    borderBottom: '1px solid var(--border-color)'
  },
  listHeaderCell: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500'
  },
  listBody: {
    display: 'flex',
    flexDirection: 'column'
  },
  listRow: {
    display: 'flex',
    padding: '12px 16px',
    borderBottom: '1px solid var(--bg-tertiary)',
    alignItems: 'center',
    backgroundColor: 'var(--bg-secondary)',
    // Slight gray background like screenshot
    cursor: 'pointer'
  },
  listCell: {
    display: 'flex',
    alignItems: 'center'
  },
  listNameWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  listFolderIcon: {
    fontSize: '20px',
    color: 'var(--text-tertiary)'
  },
  listNameText: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    fontWeight: '400'
  },
  listJoinedText: {
    fontSize: '12px',
    color: 'var(--accent-success)' // Green
  },
  memberBadgeSmall: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#F9A8D4',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 'bold'
  },
  starIcon: {
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontSize: '16px'
  },
  shareBtn: {
    padding: '4px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '13px',
    cursor: 'pointer'
  },
  // Wizard Styles
  creationContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'var(--bg-primary)'
  },
  creationHeader: {
    padding: '24px 32px'
  },
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: 'var(--text-secondary)'
  },
  creationContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '500px',
    margin: '0 auto',
    width: '100%',
    paddingBottom: '40px'
  },
  creationTitle: {
    fontSize: '28px',
    fontWeight: '400',
    color: 'var(--text-primary)',
    marginBottom: '32px'
  },
  creationTitleCenter: {
    fontSize: '28px',
    fontWeight: '400',
    color: 'var(--text-primary)',
    marginBottom: '32px',
    textAlign: 'center'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '24px'
  },
  formLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '8px'
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  learnMore: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    textDecoration: 'underline'
  },
  formInput: {
    padding: '8px 12px',
    border: 'none',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '4px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    outline: 'none'
  },
  formSelect: {
    padding: '8px 12px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '4px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    outline: 'none'
  },
  viewCardsGrid: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  viewCard: {
    flex: 1,
    minWidth: '130px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.1s'
  },
  viewCardSelected: {
    border: '1px solid var(--accent-primary)',
    backgroundColor: 'var(--bg-tertiary)'
  },
  viewCardIcon: {
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px'
  },
  iconGray: {
    color: 'var(--text-tertiary)'
  },
  iconBlue: {
    color: 'var(--accent-primary)'
  },
  fakeListRow: {
    width: '24px',
    height: '4px',
    backgroundColor: 'currentColor',
    borderRadius: '2px',
    margin: '4px 0'
  },
  fakeTimeline: {
    width: '24px',
    height: '12px',
    borderTop: '2px solid currentColor',
    borderBottom: '2px solid currentColor'
  },
  fakeWorkload: {
    width: '24px',
    height: '16px',
    borderBottom: '2px solid currentColor',
    borderLeft: '2px solid currentColor'
  },
  viewCardText: {
    fontSize: '13px',
    color: 'var(--text-primary)'
  },
  continueBtn: {
    padding: '10px 16px',
    backgroundColor: 'var(--accent-primary)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '16px'
  },
  actionCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '24px',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    cursor: 'pointer',
    marginBottom: '16px',
    transition: 'all 0.1s'
  },
  actionCardSelected: {
    border: '1px solid var(--accent-primary)',
    backgroundColor: 'var(--bg-tertiary)'
  },
  actionIconCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '2px dashed var(--accent-primary)',
    color: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    marginRight: '16px'
  },
  actionIconUsers: {
    width: '40px',
    height: '40px',
    color: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    marginRight: '16px'
  },
  actionCardTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    marginBottom: '4px'
  },
  actionCardSub: {
    fontSize: '13px',
    color: 'var(--text-secondary)'
  }
};