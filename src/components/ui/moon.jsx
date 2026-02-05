"use client";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import clsx from "clsx";

const MoonIcon = forwardRef(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const svgRef = useRef(null);
    const isControlledRef = useRef(false);

    const start = () => {
      svgRef.current?.classList.add("moon-animate");
    };

    const stop = () => {
      svgRef.current?.classList.remove("moon-animate");
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
          .moon-icon {
            transform-origin: center;
          }
          .moon-animate {
            animation: moon-wobble 1.2s ease-in-out;
          }
          @keyframes moon-wobble {
            0% { transform: rotate(0deg); }
            20% { transform: rotate(-10deg); }
            40% { transform: rotate(10deg); }
            60% { transform: rotate(-5deg); }
            80% { transform: rotate(5deg); }
            100% { transform: rotate(0deg); }
          }
        `}</style>

        <svg
          ref={svgRef}
          className="moon-icon"
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
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      </div>
    );
  },
);

MoonIcon.displayName = "MoonIcon";
export default MoonIcon;
