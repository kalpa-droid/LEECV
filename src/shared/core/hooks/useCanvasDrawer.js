import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useCanvasDrawer.js
 * Shared hook to encapsulate canvas initialization, image loading, zoom, rotation,
 * dragging offsets, and export rendering for image croppers and canvas drawing tools.
 */
export function useCanvasDrawer({ rawImageSrc, defaultZoom = 1, defaultRotation = 0 }) {
  const [zoom, setZoom] = useState(defaultZoom);
  const [rotation, setRotation] = useState(defaultRotation);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // Initialize canvas with loaded image
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imageRef.current && imageRef.current.complete) {
      ctx.save();
      ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.drawImage(
        imageRef.current,
        -imageRef.current.width / 2,
        -imageRef.current.height / 2
      );
      ctx.restore();
    }
  }, [zoom, rotation, offset]);

  useEffect(() => {
    if (!rawImageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      redraw();
    };
    img.src = rawImageSrc;
  }, [rawImageSrc, redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetTransforms = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  return {
    canvasRef,
    zoom,
    setZoom,
    rotation,
    setRotation,
    offset,
    setOffset,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetTransforms,
    redraw
  };
}
