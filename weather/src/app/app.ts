import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { WeatherService } from './core/weather.service';

interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }>; }

@Component({ selector: 'app-root', imports: [RouterOutlet, RouterLink, RouterLinkActive], templateUrl: './app.html', styleUrl: './app.css' })
export class App {
  readonly weather = inject(WeatherService);
  readonly update = inject(SwUpdate);
  readonly installPrompt = signal<InstallPrompt | null>(null);
  readonly updateReady = signal(false);
  constructor() {
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); this.installPrompt.set(event as InstallPrompt); });
    window.addEventListener('appinstalled', () => this.installPrompt.set(null));
    if (this.update.isEnabled) this.update.versionUpdates.subscribe(event => {
      if (event.type === 'VERSION_READY') this.updateReady.set(true);
    });
  }
  async install(): Promise<void> {
    const prompt = this.installPrompt();
    if (prompt) { await prompt.prompt(); await prompt.userChoice; this.installPrompt.set(null); }
  }
  reload(): void { window.location.reload(); }
}
