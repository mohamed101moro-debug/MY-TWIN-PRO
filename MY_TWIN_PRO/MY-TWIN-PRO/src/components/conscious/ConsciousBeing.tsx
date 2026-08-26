import React from 'react';
import ConsciousStage from './ConsciousStage';
import LivingEntity from './LivingEntity';
/**
 * ConsciousBeing v3.1 — الموصِّل المحصَّن:
 * Boundary كبرى (LivingEntity عند أي استثناء) + ConsciousStage مضيفًا بصريًا وحيدًا
 * (ولادة + موجة + جو + شبكات طبقات + safe-mode + lowPower) ⇒ صفر ملفات معزولة.
 */
class BeingBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: any) { try { console.warn('[BEING]', String(e?.message)); } catch {} }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export default function ConsciousBeing({ size = 300 }: { size?: number }) {
  return (
    <BeingBoundary fallback={<LivingEntity size={size} />}>
      <ConsciousStage size={size} />
    </BeingBoundary>
  );
}
