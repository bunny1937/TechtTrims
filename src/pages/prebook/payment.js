import { useRouter } from "next/router";
import { useState } from "react";
import styles from "../../styles/Payment.module.css";
import { showSuccess } from "../../lib/toast";

export default function PrebookPayment() {
  const router = useRouter();
  const { bookingId, amount, bookingCode } = router.query;
  const [processing, setProcessing] = useState(false);

  const handlePaymentDone = async () => {
    setProcessing(true);

    // Simulate processing delay
    setTimeout(() => {
      showSuccess("Booking confirmed! Redirecting to confirmation page...");
      router.push(`/prebook/confirmation?bookingId=${bookingId}`);
    }, 1500);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Payment</h1>
          <p className={styles.bookingCode}>Booking Code: {bookingCode}</p>
        </div>

        <div className={styles.amountSection}>
          <p className={styles.amountLabel}>Amount to Pay</p>
          <h2 className={styles.amount}>₹{amount}</h2>
        </div>

        <div className={styles.fallbackNotice}>
          <p>
            💳 <strong>Payment Gateway Integration Coming Soon</strong>
          </p>
          <p>
            For now, please pay at the salon when you arrive for your
            appointment.
          </p>
          <p>Your booking is confirmed and saved.</p>
        </div>

        <button
          onClick={handlePaymentDone}
          disabled={processing}
          className={styles.confirmButton}
        >
          {processing ? (
            <>
              <span className={styles.spinner}></span> Processing...
            </>
          ) : (
            "I Understand - Continue to Booking"
          )}
        </button>

        <p className={styles.helpText}>
          You will receive a confirmation email with booking details and
          calendar reminder.
        </p>
      </div>
    </div>
  );
}
