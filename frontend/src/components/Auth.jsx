import { useTranslation } from "react-i18next";
import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { apiFetch } from '../api';
export default function Auth({
  setToken,
  setUser
}) {
  const {
    t
  } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const handleAuth = async e => {
    e.preventDefault();
    const endpoint = isLogin ? 'login' : 'register';
    try {
      const response = await apiFetch(`/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(isLogin ? {
          email,
          password,
          rememberMe
        } : {
          name,
          email,
          password,
          rememberMe
        })
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMsg = typeof data.error === 'object' ? data.error.message : data.error;
        throw new Error(errorMsg || 'An unknown error occurred');
      }
      if (isLogin) {
        localStorage.setItem('token', data.token);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      } else {
        // Auto-login after registration
        if (data.token) {
          localStorage.setItem('token', data.token);
          if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
          localStorage.setItem('user', JSON.stringify(data.user));
          setToken(data.token);
          setUser(data.user);
        } else {
          setAuthMessage('Kayıt başarılı! Giriş yapabilirsiniz.');
          setIsLogin(true);
        }
      }
    } catch (err) {
      setAuthMessage(err.message);
    }
  };
  const handleGoogleSuccess = async credentialResponse => {
    try {
      const response = await apiFetch(`/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: credentialResponse.credential,
          rememberMe
        })
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMsg = typeof data.error === 'object' ? data.error.message : data.error;
        throw new Error(errorMsg || 'An unknown error occurred');
      }
      localStorage.setItem('token', data.token);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setAuthMessage(err.message || 'Google ile giriş başarısız oldu.');
    }
  };
  const handleGoogleError = () => {
    setAuthMessage('Google ile giriş başarısız oldu.');
  };
  return <div style={styles.container}>
      {/* LEFT: Branded Hero */}
      <div style={styles.heroSide}>
        <div style={styles.heroContent}>
          <div style={styles.heroLogo}>
            <div style={styles.heroLogoIcon}>PM</div>
            <span style={styles.heroLogoText}>ProjectMan</span>
          </div>
          <h1 style={styles.heroTitle}>Organize your work,<br/>deliver results.</h1>
          <p style={styles.heroSubtitle}>Plan projects, track tasks, and collaborate with your team — all in one place.</p>
          
          {/* Decorative floating shapes */}
          <div style={styles.floatingShape1}></div>
          <div style={styles.floatingShape2}></div>
          <div style={styles.floatingShape3}></div>
        </div>
      </div>

      {/* RIGHT: Auth Form */}
      <div style={styles.formSide}>
        <div style={styles.card}>
          <h2 style={styles.heading}>{isLogin ? t("giris_yap", "Giriş Yap") : t("kayit_ol", "Kayıt Ol")}</h2>
          <p style={styles.subheading}>{isLogin ? t("devam_etmek_icin", "Devam etmek için hesabınıza giriş yapın") : t("yeni_hesap_olusturun", "Yeni bir hesap oluşturun")}</p>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            marginTop: '0.5rem'
          }}>
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} theme="outline" size="large" text={isLogin ? "signin_with" : "signup_with"} shape="rectangular" width="100%" />
          </div>
          
          <div style={styles.divider}>
            <div style={styles.dividerLine}></div>
            <span style={styles.dividerText}>{t("veya_email_ile", "veya email ile")}</span>
            <div style={styles.dividerLine}></div>
          </div>

          <form onSubmit={handleAuth} style={styles.form}>
            {!isLogin && <input type="text" placeholder={t("ad_soyad", "Ad Soyad")} value={name} onChange={e => setName(e.target.value)} style={styles.input} required />}
            <input type="email" placeholder={t("e_posta", "E-posta")} value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
            <input type="password" placeholder={t("ifre", "\u015Eifre")} value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
            
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />{t("oturumumu_a_k_tut_30_g_n", "Oturumumu açık tut (30 gün)")}
            </label>

            <button type="submit" style={styles.button}>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</button>
          </form>
          {authMessage && <p style={styles.errorMsg}>{authMessage}</p>}
          <p onClick={() => setIsLogin(!isLogin)} style={styles.switchLink}>
            {isLogin ? 'Hesap Oluştur' : 'Zaten üye misin? Giriş yap'}
          </p>
        </div>
      </div>
    </div>;
}
const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: 'hidden'
  },
  heroSide: {
    flex: 1,
    background: 'linear-gradient(135deg, #0B0F19 0%, #0F766E 50%, #14B8A6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    minWidth: 0
  },
  heroContent: {
    position: 'relative',
    zIndex: 2,
    padding: '3rem',
    maxWidth: '500px'
  },
  heroLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '2rem'
  },
  heroLogoIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(8px)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.85rem',
    letterSpacing: '-0.5px'
  },
  heroLogoText: {
    color: 'white',
    fontSize: '1.2rem',
    fontWeight: '600',
    letterSpacing: '-0.3px'
  },
  heroTitle: {
    color: 'white',
    fontSize: '2.5rem',
    fontWeight: '700',
    lineHeight: 1.2,
    margin: '0 0 1rem 0',
    letterSpacing: '-0.5px'
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '1.1rem',
    lineHeight: 1.6,
    margin: 0
  },
  floatingShape1: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)',
    top: '-60px',
    right: '-40px'
  },
  floatingShape2: {
    position: 'absolute',
    width: '120px',
    height: '120px',
    borderRadius: '24px',
    background: 'rgba(255,255,255,0.04)',
    bottom: '-20px',
    left: '-30px',
    transform: 'rotate(45deg)'
  },
  floatingShape3: {
    position: 'absolute',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    top: '40%',
    right: '-20px'
  },
  formSide: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-primary)',
    minWidth: 0
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '2rem'
  },
  heading: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 0.25rem 0',
    letterSpacing: '-0.3px'
  },
  subheading: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    margin: '0 0 1.5rem 0'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '1rem 0'
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'var(--border-color)'
  },
  dividerText: {
    margin: '0 10px',
    color: 'var(--text-tertiary)',
    fontSize: '0.85rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  input: {
    padding: '0.7rem 0.85rem',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    cursor: 'pointer'
  },
  button: {
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #0F766E, #14B8A6)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.95rem',
    transition: 'opacity 0.2s ease, transform 0.1s ease',
    marginTop: '0.25rem'
  },
  errorMsg: {
    textAlign: 'center',
    color: 'var(--accent-danger)',
    marginTop: '1rem',
    fontSize: '0.9rem'
  },
  switchLink: {
    textAlign: 'center',
    cursor: 'pointer',
    color: 'var(--accent-primary)',
    marginTop: '1.5rem',
    fontSize: '0.9rem',
    fontWeight: '500'
  }
};