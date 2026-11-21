import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Stand-in shaped like a paper card, so the page keeps its layout while results load. */
@Component({
  selector: 'app-paper-card-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" aria-hidden="true">
      <span class="bar meta"></span>
      <span class="bar title"></span>
      <span class="bar title short"></span>
      <span class="bar line"></span>
      <span class="bar line"></span>
      <span class="bar line short"></span>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .card {
      display: grid;
      gap: var(--space-3);
      min-height: 15rem;
      padding: var(--space-6);
      align-content: start;
      background: var(--surface);
      border: 1px solid var(--rule);
      border-radius: var(--radius-l);
      animation: pulse 1.4s ease-in-out infinite;
    }
    .bar {
      display: block;
      height: 0.75rem;
      border-radius: 999px;
      background: var(--surface-sunk);
    }
    .meta {
      width: 40%;
      height: 0.625rem;
    }
    .title {
      height: 1.125rem;
      margin-top: var(--space-1);
    }
    .short {
      width: 62%;
    }
    @keyframes pulse {
      50% {
        opacity: 0.55;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .card {
        animation: none;
      }
    }
  `,
})
export class PaperCardSkeleton {}
