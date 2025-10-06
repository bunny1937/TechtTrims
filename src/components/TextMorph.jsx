// components/TextMorph.js
import React, { useEffect, useRef } from "react";

const texts = ["Why", "is", "this", "so", "satisfying", "to", "watch?"];

const morphTime = 1;
const cooldownTime = 0.25;

const TextMorph = () => {
  const text1Ref = useRef(null);
  const text2Ref = useRef(null);

  const textIndexRef = useRef(texts.length - 1);
  const morphRef = useRef(0);
  const cooldownRef = useRef(cooldownTime);
  const timeRef = useRef(new Date());

  useEffect(() => {
    const elts = {
      text1: text1Ref.current,
      text2: text2Ref.current,
    };

    elts.text1.textContent = texts[textIndexRef.current % texts.length];
    elts.text2.textContent = texts[(textIndexRef.current + 1) % texts.length];

    function setMorph(fraction) {
      elts.text2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
      elts.text2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

      fraction = 1 - fraction;
      elts.text1.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
      elts.text1.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

      elts.text1.textContent = texts[textIndexRef.current % texts.length];
      elts.text2.textContent = texts[(textIndexRef.current + 1) % texts.length];
    }

    function doMorph() {
      morphRef.current -= cooldownRef.current;
      cooldownRef.current = 0;

      let fraction = morphRef.current / morphTime;

      if (fraction > 1) {
        cooldownRef.current = cooldownTime;
        fraction = 1;
      }

      setMorph(fraction);
    }

    function doCooldown() {
      morphRef.current = 0;
      elts.text2.style.filter = "";
      elts.text2.style.opacity = "100%";
      elts.text1.style.filter = "";
      elts.text1.style.opacity = "0%";
    }

    function animate() {
      requestAnimationFrame(animate);
      const newTime = new Date();
      const dt = (newTime - timeRef.current) / 1000;
      timeRef.current = newTime;

      if (cooldownRef.current > 0) {
        cooldownRef.current -= dt;
        if (cooldownRef.current <= 0) {
          textIndexRef.current++;
          doMorph();
        } else {
          doCooldown();
        }
      } else {
        morphRef.current += dt;
        doMorph();
      }
    }

    animate();

    return () => {
      // Cleanup: nothing special needed because animate uses requestAnimationFrame loop
      // If wanted, could implement cancelation logic here.
    };
  }, []);

  return (
    <>
      <div id="container">
        <span id="text1" ref={text1Ref} />
        <span id="text2" ref={text2Ref} />
      </div>
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css?family=Raleway:900&display=swap");

        text #container {
          position: absolute;
          margin: auto;
          width: 100vw;
          height: 80pt;
          top: 0;
          bottom: 0;
          filter: url(#threshold) blur(0.6px);
        }

        #text1,
        #text2 {
          position: absolute;
          width: 100%;
          display: inline-block;
          font-family: "Raleway", sans-serif;
          font-size: 80pt;
          text-align: center;
          user-select: none;
          left: 0;
          right: 0;
          margin: auto;
        }
      `}</style>

      {/* SVG filter referenced by CSS filter property */}
      <svg
        style={{ position: "absolute", width: 0, height: 0 }}
        aria-hidden="true"
      >
        <defs>
          <filter id="threshold" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>
    </>
  );
};

export default TextMorph;
