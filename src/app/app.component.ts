import { Component, HostListener, OnDestroy, OnInit, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { PresenceService } from "./presence.service";
import { Subject, takeUntil } from "rxjs";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { BirthdayModalComponent } from "app/shared/components/birthday-modal/birthday-modal.component";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  standalone: true,
  imports: [RouterOutlet, MatDialogModule],
})
export class AppComponent implements OnInit, OnDestroy {
  private _unsubscribeAll = new Subject<void>();
  connectedUsers: string[] = [];
  private inactivityTimeout!: ReturnType<typeof setTimeout>;
  private readonly inactivityLimit = 60000;
  private isInactive = false;
  private _dialog = inject(MatDialog);

  constructor(private presenceService: PresenceService) { }

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

    // Check for birthday
    this.checkBirthday(storedData);

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

  private checkBirthday(userData: any): void {
    const fechaNacimiento = userData?.usuario?.fechaNacimiento;
    const userId = userData?.usuario?.id;

    console.log('🎂 Revisando cumpleaños...', { fechaNacimiento, userId });

    if (!fechaNacimiento || !userId) return;

    // Usar un método más robusto para evitar desfases de zona horaria
    // Asumiendo formato YYYY-MM-DD o ISO
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth() + 1; // getMonth() es 0-11

    let birthDay, birthMonth;

    if (typeof fechaNacimiento === 'string' && fechaNacimiento.includes('-')) {
      // Si es un string "XXXX-MM-DD...", extraemos directamente los números
      const parts = fechaNacimiento.split('T')[0].split('-');
      birthMonth = parseInt(parts[1], 10);
      birthDay = parseInt(parts[2], 10);
    } else {
      const birthDate = new Date(fechaNacimiento);
      birthDay = birthDate.getDate();
      birthMonth = birthDate.getMonth() + 1;
    }

    console.log('📅 Comparación:', {
      hoy: `${todayDay}/${todayMonth}`,
      cumple: `${birthDay}/${birthMonth}`
    });

    const isBirthday = birthDay === todayDay && birthMonth === todayMonth;

    if (isBirthday) {
      console.log('🎉 ¡Es tu cumpleaños! Abriendo modal...');
      const year = today.getFullYear();
      const storageKey = `birthday_celebrated_${year}_${userId}`;
      const alreadyCelebrated = localStorage.getItem(storageKey);

      if (!alreadyCelebrated) {
        this.showBirthdayCelebration();
        localStorage.setItem(storageKey, 'true');
      } else {
        console.log('🎈 Ya celebramos hoy, no mostramos de nuevo.');
      }
    } else {
      console.log('⏳ Aún no es tu cumpleaños.');
    }
  }

  private showBirthdayCelebration(): void {
    this._dialog.open(BirthdayModalComponent, {
      width: '500px',
      panelClass: 'birthday-modal-panel',
      autoFocus: false,
      disableClose: false
    });
  }
}