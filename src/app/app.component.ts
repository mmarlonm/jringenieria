import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { PresenceService } from "./presence.service";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  standalone: true,
  imports: [RouterOutlet],
})
export class AppComponent implements OnInit, OnDestroy {
  private _unsubscribeAll = new Subject<void>();
  connectedUsers: string[] = [];
  private inactivityTimeout!: ReturnType<typeof setTimeout>;
  private readonly inactivityLimit = 60000;
  private isInactive = false;

  constructor(private presenceService: PresenceService) {}

  @HostListener("window:beforeunload")
  unloadHandler(): void {
    this.presenceService.stopConnection();
  }

  ngOnInit(): void {
    const token = localStorage.getItem("accessToken");
    const storedData = this.safeParse(localStorage.getItem("userInformation"));
    const userId = storedData?.usuario?.id;

    if (!token || !userId) {
      this.presenceService.stopConnection();
      return;
    }

    this.presenceService.startConnection(token, userId);
    this.presenceService
      .onUsuarioConectado()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((newConnectedUsers: string[]) => {
        this.connectedUsers = newConnectedUsers;
      });

    this.startInactivityWatch();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    this.presenceService.stopConnection();
    clearTimeout(this.inactivityTimeout);
    window.removeEventListener("mousemove", this.resetInactivityTimer);
    window.removeEventListener("keydown", this.resetInactivityTimer);
    window.removeEventListener("click", this.resetInactivityTimer);
  }

  startInactivityWatch(): void {
    this.resetInactivityTimer = this.resetInactivityTimer.bind(this); // ensure `this` is correct
    window.addEventListener("mousemove", this.resetInactivityTimer);
    window.addEventListener("keydown", this.resetInactivityTimer);
    window.addEventListener("click", this.resetInactivityTimer);
    this.resetInactivityTimer();
  }

  resetInactivityTimer(): void {
    clearTimeout(this.inactivityTimeout);

    if (this.isInactive) {
      this.isInactive = false;
      this.presenceService.setActive();
    }

    this.inactivityTimeout = setTimeout(() => {
      this.isInactive = true;
      this.presenceService.setAway();
    }, this.inactivityLimit);
  }

  private safeParse(data: string | null): any {
    try {
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
}