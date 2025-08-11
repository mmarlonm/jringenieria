import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-neumorphic-progress',
  standalone: true,
  templateUrl: './neumorphic-progress.component.html',
  styleUrls: ['./neumorphic-progress.component.scss']
})
export class NeumorphicProgressComponent implements OnChanges {
  @Input() value: number = 0; // 0 - 100
  @Input() max: number = 100;
  @Input() height: string = '28px';
  @Input() accentColor: string = '#6ea8fe';

  animatedValue: number = 0;
  transitionMs = 700;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value']) {
      const prev = changes['value'].previousValue ?? 0;
      const curr = changes['value'].currentValue ?? 0;
      this.animateValue(prev, curr, this.transitionMs);
    }
  }

  clamp(v: number, a = 0, b = 100) { 
    return Math.max(a, Math.min(b, v || 0)); 
  }

  animateValue(from: number, to: number, duration = 700) {
    const start = performance.now();
    const diff = to - from;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic easing
      const eased = 1 - Math.pow(1 - t, 3);
      this.animatedValue = Math.round(from + diff * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  get percentage(): number {
    return (this.value / this.max) * 100;
  }
}
