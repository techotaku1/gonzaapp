'use client';

import React, { useEffect, useRef, useState } from 'react';

interface StickyHorizontalScrollProps {
  targetRef: React.RefObject<HTMLElement | HTMLDivElement>;
  className?: string;
  height?: number;
  zIndex?: number;
}

const StickyHorizontalScroll = ({
  targetRef,
  className = '',
  height = 5,
  zIndex = 50,
}: StickyHorizontalScrollProps) => {
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [barStyle, setBarStyle] = useState<React.CSSProperties>({});
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);

  // Calcula el ancho y posición del thumb (más pequeño)
  const thumbWidth =
    clientWidth > 0 && scrollWidth > 0
      ? Math.max(16, (clientWidth / scrollWidth) * clientWidth)
      : 0;

  const thumbLeft =
    scrollWidth > clientWidth
      ? (scrollLeft / (scrollWidth - clientWidth)) * (clientWidth - thumbWidth)
      : 0;

  // Actualiza el scroll info y visibilidad
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const updateScrollInfo = () => {
      if (!target) return;
      const { scrollWidth, clientWidth, scrollLeft } = target;
      setScrollWidth(scrollWidth);
      setClientWidth(clientWidth);
      setScrollLeft(scrollLeft);
      setIsVisible(scrollWidth > clientWidth + 1);
    };

    const handleTargetScroll = () => {
      if (target && !isDraggingRef.current) {
        setScrollLeft(target.scrollLeft);
      }
    };

    const resizeObserver = new ResizeObserver(updateScrollInfo);
    resizeObserver.observe(target);
    target.addEventListener('scroll', handleTargetScroll);

    updateScrollInfo();

    return () => {
      resizeObserver.unobserve(target);
      target.removeEventListener('scroll', handleTargetScroll);
    };
  }, [targetRef]);

  // Posiciona la barra justo debajo del contenedor de scroll
  useEffect(() => {
    const target = targetRef.current;
    if (!target || !scrollbarRef.current) return;

    const updateBarPosition = () => {
      setBarStyle({
        position: 'absolute',
        left: 0,
        top: target.offsetHeight - height,
        width: '100%',
        height: `${height}px`,
        zIndex,
        cursor: 'pointer',
        pointerEvents: 'auto',
      });
    };

    updateBarPosition();

    // Observa cambios de tamaño del contenedor
    const resizeObserver = new ResizeObserver(updateBarPosition);
    resizeObserver.observe(target);

    return () => {
      resizeObserver.disconnect();
    };
  }, [targetRef, height, zIndex, clientWidth, scrollWidth]);

  // Drag en toda la barra, no solo el thumb
  const handleBarMouseDown = (e: React.MouseEvent) => {
    if (!scrollbarRef.current || !targetRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startScrollLeftRef.current = targetRef.current.scrollLeft;
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !targetRef.current) return;
      const dx = e.clientX - startXRef.current;
      // Sensibilidad: mueve más rápido el scroll (ajusta el factor si quieres)
      const scrollRatio =
        scrollWidth > clientWidth && clientWidth - thumbWidth !== 0
          ? (scrollWidth - clientWidth) / (clientWidth - thumbWidth)
          : 1;
      const newScrollLeft = startScrollLeftRef.current + dx * scrollRatio;
      targetRef.current.scrollLeft = Math.max(
        0,
        Math.min(newScrollLeft, scrollWidth - clientWidth)
      );
      setScrollLeft(targetRef.current.scrollLeft);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.userSelect = '';
    };

    if (isDraggingRef.current) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [clientWidth, scrollWidth, targetRef, thumbWidth]);

  // Click en la barra para mover a la derecha/izquierda (solo si no es drag)
  const handleBarClick = (e: React.MouseEvent) => {
    if (isDraggingRef.current) return; // Si está drag, ignora el click
    if (!scrollbarRef.current || !targetRef.current) return;
    const clickX =
      e.clientX - scrollbarRef.current.getBoundingClientRect().left;

    if (clickX >= thumbLeft && clickX <= thumbLeft + thumbWidth) {
      return;
    }
    if (clickX > thumbLeft + thumbWidth) {
      targetRef.current.scrollLeft = Math.min(
        scrollLeft + clientWidth,
        scrollWidth - clientWidth
      );
      setScrollLeft(targetRef.current.scrollLeft);
    } else if (clickX < thumbLeft) {
      targetRef.current.scrollLeft = Math.max(scrollLeft - clientWidth, 0);
      setScrollLeft(targetRef.current.scrollLeft);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`bg-gray-200 shadow-md ${className}`}
      style={barStyle}
      ref={scrollbarRef}
      onMouseDown={handleBarMouseDown}
      onClick={handleBarClick}
    >
      <div className="relative h-full w-full bg-gray-300">
        <div
          className="absolute h-full cursor-pointer rounded bg-gray-500 transition-colors hover:bg-gray-600 active:cursor-grabbing"
          style={{
            width: `${thumbWidth}px`,
            left: `${thumbLeft}px`,
            minWidth: '16px',
            height: '100%',
          }}
        />
      </div>
    </div>
  );
};

export default StickyHorizontalScroll;
