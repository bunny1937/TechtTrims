import styles from "../styles/Home.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerMain}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>
              <div className={styles.footerLogoIcon}>✨</div>
              <h4>TechTrims</h4>
            </div>
            <p className={styles.footerTagline}>
              Elevating beauty experiences through technology and luxury
            </p>
            <div className={styles.footerSocials}>
              <button className={styles.socialButton} aria-label="Facebook">
                📘
              </button>
              <button className={styles.socialButton} aria-label="Instagram">
                📸
              </button>
              <button className={styles.socialButton} aria-label="Twitter">
                🐦
              </button>
              <button className={styles.socialButton} aria-label="LinkedIn">
                💼
              </button>
            </div>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerColumn}>
              <h5 className={styles.footerColumnTitle}>Services</h5>
              <ul className={styles.footerList}>
                <li>
                  <a href="#haircut">Hair Styling</a>
                </li>
                <li>
                  <a href="#facial">Facial Treatments</a>
                </li>
                <li>
                  <a href="#manicure">Nail Care</a>
                </li>
                <li>
                  <a href="#massage">Spa & Massage</a>
                </li>
              </ul>
            </div>

            <div className={styles.footerColumn}>
              <h5 className={styles.footerColumnTitle}>For Business</h5>
              <ul className={styles.footerList}>
                <li>
                  <a href="#register">Register Your Salon</a>
                </li>
                <li>
                  <a href="#partner">Partner with Us</a>
                </li>
                <li>
                  <a href="#business">Business Solutions</a>
                </li>
                <li>
                  <a href="#support">Business Support</a>
                </li>
              </ul>
            </div>

            <div className={styles.footerColumn}>
              <h5 className={styles.footerColumnTitle}>Support</h5>
              <ul className={styles.footerList}>
                <li>
                  <a href="#help">Help Center</a>
                </li>
                <li>
                  <a href="#contact">Contact Us</a>
                </li>
                <li>
                  <a href="#terms">Terms of Service</a>
                </li>
                <li>
                  <a href="#privacy">Privacy Policy</a>
                </li>
              </ul>
            </div>

            <div className={styles.footerColumn}>
              <h5 className={styles.footerColumnTitle}>Connect</h5>
              <div className={styles.footerContact}>
                <p>📞 +91 98765 43210</p>
                <p>✉️ hello@techtrims.com</p>
                <p>📍 Mumbai, Maharashtra</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div className={styles.footerBottomContent}>
            <p>&copy; 2025 TechTrims. All rights reserved.</p>
            <div className={styles.footerBadges}>
              <span className={styles.footerBadge}>🔒 Secure</span>
              <span className={styles.footerBadge}>⭐ Verified</span>
              <span className={styles.footerBadge}>💎 Premium</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
