"use client";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import clsx from "clsx";

const SunIcon = forwardRef(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const svgRef = useRef(null);
    const isControlledRef = useRef(false);

    const start = () => {
      svgRef.current?.classList.add("sun-animate");
    };

    const stop = () => {
      svgRef.current?.classList.remove("sun-animate");
    };

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: start,
        stopAnimation: stop,
      };
    });

    const handleMouseEnter = useCallback(
      (e) => {
        if (!isControlledRef.current) start();
        else onMouseEnter?.(e);
      },
      [onMouseEnter],
    );

    const handleMouseLeave = useCallback(
      (e) => {
        if (!isControlledRef.current) stop();
        else onMouseLeave?.(e);
      },
      [onMouseLeave],
    );

    return (
      <div
        className={clsx(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <style>{`
          .sun-ray {
            opacity: 1;
          }
          .sun-animate .sun-ray {
            opacity: 0;
            animation: sun-ray-fade 0.3s ease forwards;
          }
          @keyframes sun-ray-fade {
            to { opacity: 1; }
          }
        `}</style>

        <svg
          ref={svgRef}
          className="sun-icon"
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />

          {[
            "M12 2v2",
            "m19.07 4.93-1.41 1.41",
            "M20 12h2",
            "m17.66 17.66 1.41 1.41",
            "M12 20v2",
            "m6.34 17.66-1.41 1.41",
            "M2 12h2",
            "m4.93 4.93 1.41 1.41",
          ].map((d, i) => (
            <path
              key={d}
              d={d}
              className="sun-ray"
              style={{ animationDelay: `${(i + 1) * 0.1}s` }}
            />
          ))}
        </svg>
      </div>
    );
  },
);

SunIcon.displayName = "SunIcon";
export default SunIcon;
