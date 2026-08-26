import { useTranslation } from "react-i18next";
import { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  updateProfile,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { apiFetch } from '../api';

export default function Auth({
  setToken,
  setUser
}) {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  
  const syncWithBackend = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      // Inform the backend to create/sync the user
      const response = await apiFetch(`/api/auth/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Backend sync failed');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(token);
      setUser(data.user);
    } catch (err) {
      console.error('Sync Error:', err);
      setAuthMessage('An error occurred while syncing with the server.');
      // Optional: Sign out from firebase if backend fails
      auth.signOut();
    }
  };

  const handleAuth = async e => {
    e.preventDefault();
    setAuthMessage('');
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await syncWithBackend(userCredential.user);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await syncWithBackend(userCredential.user);
      }
    } catch (err) {
      let errorMessage = 'An error occurred';
      if (err.code === 'auth/email-already-in-use') errorMessage = 'Bu e-posta adresi zaten kullanımda.';
      else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') errorMessage = 'Geçersiz e-posta veya şifre.';
      else if (err.code === 'auth/weak-password') errorMessage = 'Şifre çok zayıf. En az 6 karakter olmalı.';
      else errorMessage = err.message;
      setAuthMessage(errorMessage);
    }
  };
  
  const handleGoogleAuth = async () => {
    setAuthMessage('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      await syncWithBackend(userCredential.user);
    } catch (err) {
      setAuthMessage(err.message || 'Google ile giriş başarısız oldu.');
    }
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
             <button onClick={handleGoogleAuth} style={styles.googleBtn}>
               <svg style={{width: '20px', height: '20px', marginRight: '10px'}} viewBox="0 0 24 24">
                 <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                 <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                 <path fill="none" d="M1 1h22v22H1z"/>
               </svg>
               {isLogin ? "Sign in with Google" : "Sign up with Google"}
             </button>
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
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
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