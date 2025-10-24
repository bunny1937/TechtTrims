import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "../styles/ImageCarousel.module.css";

export default function ImageCarousel({ images, autoPlayInterval = 3000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [images, autoPlayInterval]);

  if (!images || images.length === 0) {
    return (
      <div className={styles.noImages}>
        <p>No images available</p>
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div className={styles.container}>
      <div className={styles.carouselWrapper}>
        {/* Previous Button */}
        <button
          onClick={goToPrevious}
          className={`${styles.navButton} ${styles.navButtonLeft}`}
          aria-label="Previous image"
        >
          <ChevronLeft size={32} />
        </button>

        {/* Image Display */}
        <div className={styles.imageContainer}>
          <img
            src={images[currentIndex]}
            alt={`Slide ${currentIndex + 1}`}
            className={styles.image}
          />
        </div>

        {/* Next Button */}
        <button
          onClick={goToNext}
          className={`${styles.navButton} ${styles.navButtonRight}`}
          aria-label="Next image"
        >
          <ChevronRight size={32} />
        </button>

        {/* Dots Indicator */}
        <div className={styles.dotsContainer}>
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`${styles.dot} ${
                index === currentIndex ? styles.dotActive : styles.dotInactive
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
