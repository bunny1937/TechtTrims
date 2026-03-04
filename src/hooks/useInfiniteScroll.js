// src/hooks/useInfiniteScroll.js

import { useState, useEffect, useRef, useMemo } from "react";

/**
 * Hook to manage infinite scroll pagination for salon list
 * Uses IntersectionObserver for performance
 *
 * @param {Array} items - Array of items to paginate (salons)
 * @param {number} initialCount - Initial number of items to show (default: 6)
 * @param {number} incrementBy - How many items to load each time (default: 6)
 */
export function useInfiniteScroll(
  items = [],
  initialCount = 6,
  incrementBy = 6,
) {
  const [visibleCount, setVisibleCount] = useState(initialCount);

  useEffect(() => {
    setVisibleCount(initialCount);
  }, [items]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef(null);
  const observerRef = useRef(null);

  // Get the currently visible items
  const displayedItems = useMemo(() => {
    return items.slice(0, visibleCount);
  }, [items, visibleCount]);

  // Check if there are more items to load
  const hasMore = items.length > visibleCount;

  // Load more items
  const loadMore = () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);

    // Simulate loading delay for smooth UX
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + incrementBy, items.length));
      setIsLoadingMore(false);
    }, 300);
  };

  // Set up IntersectionObserver
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "100px", // Start loading 100px before reaching the element
        threshold: 0.1,
      },
    );

    // Start observing
    observerRef.current.observe(loadMoreRef.current);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, items.length]);

  // Reset visible count when items array changes significantly
  useEffect(() => {
    if (items.length < visibleCount) {
      setVisibleCount(Math.max(initialCount, items.length));
    }
  }, [items.length, initialCount]);

  return {
    displayedItems,
    visibleCount,
    isLoadingMore,
    loadMoreRef,
    hasMore,
    loadMore, // Manual load function if needed
  };
}
