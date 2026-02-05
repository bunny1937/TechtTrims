import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import styled from "styled-components";

/* =======================
   STYLED COMPONENTS
======================= */

const Overlay = styled(motion.div)`
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  inset: 0;
  z-index: 99;
  overflow: hidden;
  background: #fef9f0;
  background: linear-gradient(
    90deg,
    rgba(254, 249, 240, 1) 0%,
    rgba(249, 216, 154, 1) 20%,
    rgba(232, 169, 52, 1) 40%,
    rgba(195, 143, 10, 1) 61%,
    rgba(128, 82, 8, 1) 80%,
    rgba(90, 49, 6, 1) 100%
  );
  background-size: 150% 150%;
  background-position: center;
  background-repeat: no-repeat;
`;

const Word = styled(motion.p)`
  font-family: "Veldman", serif;
  color: #000;
  font-size: 10rem;
  font-weight: 700;
  text-align: center;
  position: absolute;
  margin: 0;

  @media (max-width: 900px) {
    font-size: 8rem;
  }

  @media (max-width: 500px) {
    font-size: 6rem;
  }
`;

/* =======================
   COMPONENT
======================= */

const words = ["Lets", "Get", "YOU", "Styled"];

export default function IntroOverlay({ onAnimationEnd }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < words.length - 1) {
      const timeout = setTimeout(() => {
        setIndex((prev) => prev + 1);
      }, 500);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        onAnimationEnd();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [index, onAnimationEnd]);

  return (
    <Overlay
      initial={{ top: 0 }}
      animate={{ top: "-100vh" }}
      exit={{ top: "-100vh" }}
      transition={{
        duration: 1.4,
        ease: [0.76, 0, 0.24, 1],
        delay: 1.5,
      }}
    >
      <Word
        key={index} // forces re-animation per word
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        {words[index]}
      </Word>
    </Overlay>
  );
}
