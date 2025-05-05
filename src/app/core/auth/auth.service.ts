import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { AuthUtils } from "app/core/auth/auth.utils";
import { UserService } from "app/core/user/user.service";
import { environment } from "environments/environment"; // Asegúrate de tener la URL base de tu API aquí
import { Observable, of, switchMap, throwError, from } from "rxjs";
@Injectable({ providedIn: "root" })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/Auth`; // Asegúrate de que esto sea correcto
  private _authenticated: boolean = false;
  private _httpClient = inject(HttpClient);
  private _userService = inject(UserService);

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Setter & getter for access token
   */
  set accessToken(token: string) {
    localStorage.setItem("accessToken", token);
  }

  get accessToken(): string {
    return localStorage.getItem("accessToken") ?? "";
  }

  /**
   * Setter & getter for user information
   */
  set userInformation(usr: string) {
    localStorage.setItem("userInformation", usr);
  }

  get userInformation(): any {
    return localStorage.getItem("userInformation") ?? "";
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Forgot password
   *
   * @param email
   */
  forgotPassword(email: string): Observable<any> {
    return this._httpClient.post("api/auth/forgot-password", email);
  }

  /**
   * Reset password
   *
   * @param password
   */
  resetPassword(password: string): Observable<any> {
    return this._httpClient.post("api/auth/reset-password", password);
  }

  /**
   * Sign in
   *
   * @param credentials
   */
  signIn(credentials: { username: string; password: string }): Observable<any> {
    if (this._authenticated) {
      return throwError("User is already logged in.");
    }
  
    // Convertimos la promesa en observable con from()
    return from(this.obtenerMetadataCompleta()).pipe(
      switchMap(metadata => {
        const body = {
          ...credentials,
          metadata
        };
  
        return this._httpClient.post(`${this.apiUrl}/login`, body).pipe(
          switchMap((response: any) => {
            this.accessToken = response.token;
            this._authenticated = true;
            const { token, ...userWithoutToken } = response;
            this.userInformation = JSON.stringify(userWithoutToken);
            this._userService.user = response;
            return of(response);
          })
        );
      })
    );
  }

  obtenerMetadataCompleta(): Promise<any> {
    const userAgent = navigator.userAgent;
  
    const navegador = (() => {
      if (userAgent.includes("Chrome")) return "Chrome";
      if (userAgent.includes("Firefox")) return "Firefox";
      if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
      if (userAgent.includes("Edge")) return "Edge";
      return "Desconocido";
    })();
  
    const sistemaOperativo = (() => {
      if (userAgent.includes("Windows")) return "Windows";
      if (userAgent.includes("Mac")) return "MacOS";
      if (userAgent.includes("Linux")) return "Linux";
      if (userAgent.includes("Android")) return "Android";
      if (userAgent.includes("iPhone")) return "iOS";
      return "Desconocido";
    })();
  
    const dispositivo = /Mobi|Android/i.test(userAgent) ? "Móvil" : "Escritorio";
  
    const ipPromise = fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => data.ip)
      .catch(() => "Desconocida");
  
    const ubicacionPromise = this.obtenerUbicacionPorIP();
  
    return Promise.all([ipPromise, ubicacionPromise]).then(([ip, ubicacion]) => ({
      Ip: ip,
      Navegador: navegador,
      SistemaOperativo: sistemaOperativo,
      Dispositivo: dispositivo,
      Ubicacion: ubicacion
    }));
  }

  async obtenerUbicacionPorIP(): Promise<string> {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
  
      // Ej: "Ciudad, Región, País"
      return `${data.city}, ${data.region}, ${data.country_name}`;
    } catch (error) {
      console.error('Error obteniendo ubicación por IP:', error);
      return 'Ubicación desconocida';
    }
  }

  /**
   * Sign out
   */
  signOut(): Observable<any> {
    // Remove the access token from the local storage
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userInformation");
    // Set the authenticated flag to false
    this._authenticated = false;

    // Return the observable
    return of(true);
  }

  /**
   * Sign up
   *
   * @param user
   */
  signUp(user: {
    name: string;
    email: string;
    password: string;
    company: string;
  }): Observable<any> {
    return this._httpClient.post("api/auth/sign-up", user);
  }

  /**
   * Unlock session
   *
   * @param credentials
   */
  unlockSession(credentials: {
    email: string;
    password: string;
  }): Observable<any> {
    return this._httpClient.post("api/auth/unlock-session", credentials);
  }

  /**
   * Check the authentication status
   */
  check(): Observable<boolean> {
    // Check if the user is logged in
    if (this._authenticated) {
      return of(true);
    }

    // Check the access token availability
    if (!this.accessToken) {
      return of(false);
    }

    // Check the access token expire date
    if (AuthUtils.isTokenExpired(this.accessToken)) {
      return of(false);
    }
    const user: any = JSON.parse(this.userInformation);
    this._userService.user = user;
    // If the token is available and not expired, return true
    return of(true); // Token is valid, so the user is authenticated
  }
}
