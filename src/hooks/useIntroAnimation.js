// src/hooks/useIntroAnimation.js

import { useState, useEffect } from "react";

/**
 * Hook to manage intro animation state
 * Shows animation only on first visit
 */
export function useIntroAnimation() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    // Check if intro was already shown
    const introShown = sessionStorage.getItem("introShown");

    if (introShown === "true") {
      setShowIntro(false);
    }
  }, []);

  const handleAnimationEnd = () => {
    sessionStorage.setItem("introShown", "true");
    setShowIntro(false);
  };

  return {
    showIntro,
    handleAnimationEnd,
  };
}
