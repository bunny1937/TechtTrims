import { useEffect, useState } from "react";
import styles from "../styles/Home.module.css";

export default function Testimonials() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const testimonials = [
    {
      name: "Rajesh Kumar",
      service: "Beard Styling",
      rating: 5,
      text: "Best grooming experience I've had in Mumbai. Clean, professional, and great attention to detail.",
      image:
        "https://ik.imagekit.io/m1qb6qo6qv/admin/testimonials/testimonial1_avHhlHF1B.webp",
    },
    {
      name: "Priya Sharma",
      service: "Hair Styling & Color",
      rating: 5,
      text: "Absolutely amazing experience! The staff was professional and the results exceeded my expectations.",
      image:
        "https://ik.imagekit.io/m1qb6qo6qv/admin/testimonials/testimonial2_OcGMoyPMo.webp",
    },
    {
      name: "Anita Patel",
      service: "Facial & Manicure",
      rating: 5,
      text: "Love the ambiance and service quality. Been coming here for months and never disappointed!",
      image:
        "https://ik.imagekit.io/m1qb6qo6qv/admin/testimonials/testimonial3_1aOtdneqN.webp",
    },
  ];

  return (
    <section className={styles.testimonialsSection}>
      <h2 className={styles.sectionTitle}>What Our Clients Say</h2>
      <div className={styles.testimonialsGrid}>
        {testimonials.map((testimonial, index) => (
          <div key={index} className={styles.testimonialCard}>
            <div className={styles.testimonialHeader}>
              <img
                src={`${testimonial.image}?tr=w-80,h-80,fo-face,c-at_max`}
                alt={testimonial.name}
                width={80}
                height={80}
                className={styles.testimonialAvatar}
                loading="lazy"
              />
              <div>
                <h3 className={styles.testimonialName}>{testimonial.name}</h3>
                <p className={styles.testimonialService}>
                  {testimonial.service}
                </p>
                <div className={styles.stars}>
                  {"⭐".repeat(testimonial.rating)}
                </div>
              </div>
            </div>
            <p className={styles.testimonialText}>{testimonial.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
