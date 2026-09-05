import { DEFAULT_MAP } from "./data";
import { getLocale } from "./i18n";
import type { StoryMapData } from "./types";

// Only fresh samples use this dictionary; saved maps are never translated.
const languages = ["en", "zh-TW", "ja", "ko", "de", "fr", "es"] as const;
const rows = `进入系统的用户旅程|Account access journey|進入系統的使用者旅程|システムアクセスのユーザージャーニー|시스템 접속 사용자 여정|Nutzerreise zum Systemzugang|Parcours d’accès au compte|Recorrido de acceso a la cuenta
进入系统|Access the system|進入系統|システムへのアクセス|시스템 접속|Systemzugang|Accéder au système|Acceder al sistema
账户与安全|Account and security|帳號與安全|アカウントとセキュリティ|계정 및 보안|Konto und Sicherheit|Compte et sécurité|Cuenta y seguridad
个人资料管理|Manage profile|個人資料管理|プロフィール管理|프로필 관리|Profil verwalten|Gérer le profil|Gestionar perfil
通知管理|Manage notifications|通知管理|通知管理|알림 관리|Benachrichtigungen verwalten|Gérer les notifications|Gestionar notificaciones
注册账号|Create an account|註冊帳號|アカウントを作成|계정 만들기|Konto erstellen|Créer un compte|Crear una cuenta
登录账号|Sign in|登入帳號|ログイン|로그인|Anmelden|Se connecter|Iniciar sesión
密码管理|Manage password|密碼管理|パスワード管理|비밀번호 관리|Passwort verwalten|Gérer le mot de passe|Gestionar contraseña
二次验证|Two-factor authentication|雙重驗證|二要素認証|2단계 인증|Zwei-Faktor-Authentifizierung|Authentification à deux facteurs|Autenticación de dos factores
编辑个人资料|Edit profile|編輯個人資料|プロフィールを編集|프로필 편집|Profil bearbeiten|Modifier le profil|Editar perfil
更换头像|Change avatar|更換頭像|アバターを変更|프로필 사진 변경|Profilbild ändern|Changer l’avatar|Cambiar avatar
通知设置|Notification settings|通知設定|通知設定|알림 설정|Benachrichtigungseinstellungen|Paramètres de notification|Ajustes de notificaciones
核心价值|Core value|核心價值|コアバリュー|핵심 가치|Kernnutzen|Valeur essentielle|Valor principal
版本 1|Release 1|版本 1|リリース 1|릴리스 1|Release 1|Version 1|Versión 1
增强体验|Improve the experience|增強體驗|体験の改善|경험 개선|Erlebnis verbessern|Améliorer l’expérience|Mejorar la experiencia
以后|Later|以後|今後|추후|Später|Plus tard|Más adelante
未来规划|Future plans|未來規劃|今後の計画|향후 계획|Zukünftige Pläne|Projets futurs|Planes futuros
访客|Visitor|訪客|訪問者|방문자|Besucher|Visiteur|Visitante
尚未注册或登录的用户|A user who has not registered or signed in|尚未註冊或登入的使用者|未登録または未ログインのユーザー|가입하거나 로그인하지 않은 사용자|Noch nicht registrierter oder angemeldeter Nutzer|Utilisateur non inscrit ou non connecté|Usuario sin registrar o sin sesión iniciada
注册用户|Member|註冊使用者|登録ユーザー|가입 사용자|Mitglied|Membre|Miembro
已创建账号的普通用户|A user with an account|已建立帳號的一般使用者|アカウントを持つ一般ユーザー|계정을 만든 일반 사용자|Nutzer mit einem Konto|Utilisateur disposant d’un compte|Usuario con una cuenta
管理员|Administrator|管理員|管理者|관리자|Administrator|Administrateur|Administrador
负责账号和安全管理|Manages accounts and security|負責帳號與安全管理|アカウントとセキュリティを管理|계정 및 보안 관리 담당|Verwaltet Konten und Sicherheit|Gère les comptes et la sécurité|Gestiona cuentas y seguridad
使用邮箱注册|Sign up with email|使用電子郵件註冊|メールで登録|이메일로 가입|Mit E-Mail registrieren|S’inscrire par e-mail|Registrarse con correo
新用户可以使用邮箱地址创建账号。|New users can create an account with an email address.|新使用者可以使用電子郵件地址建立帳號。|新規ユーザーはメールアドレスでアカウントを作成できます。|신규 사용자는 이메일 주소로 계정을 만들 수 있습니다.|Neue Nutzer können mit einer E-Mail-Adresse ein Konto erstellen.|Les nouveaux utilisateurs peuvent créer un compte avec une adresse e-mail.|Los nuevos usuarios pueden crear una cuenta con una dirección de correo.
注册|Sign-up|註冊|登録|가입|Registrierung|Inscription|Registro
邮箱|Email|電子郵件|メール|이메일|E-Mail|E-mail|Correo
验证邮箱|Verify email|驗證電子郵件|メールを確認|이메일 인증|E-Mail bestätigen|Vérifier l’e-mail|Verificar correo
验证|Verification|驗證|確認|인증|Verifizierung|Vérification|Verificación
设置密码|Set password|設定密碼|パスワードを設定|비밀번호 설정|Passwort festlegen|Définir le mot de passe|Establecer contraseña
使用邮箱登录|Sign in with email|使用電子郵件登入|メールでログイン|이메일로 로그인|Mit E-Mail anmelden|Se connecter par e-mail|Iniciar sesión con correo
注册用户可以使用邮箱地址和密码进入系统。|Members can sign in with their email address and password.|註冊使用者可以使用電子郵件地址與密碼進入系統。|登録ユーザーはメールアドレスとパスワードでログインできます。|가입 사용자는 이메일 주소와 비밀번호로 로그인할 수 있습니다.|Mitglieder können sich mit E-Mail-Adresse und Passwort anmelden.|Les membres peuvent se connecter avec leur adresse e-mail et leur mot de passe.|Los miembros pueden iniciar sesión con su correo y contraseña.
登录|Sign-in|登入|ログイン|로그인|Anmeldung|Connexion|Inicio de sesión
保持登录状态|Stay signed in|保持登入狀態|ログイン状態を維持|로그인 상태 유지|Angemeldet bleiben|Rester connecté|Mantener la sesión
显示登录失败原因|Show sign-in errors|顯示登入失敗原因|ログインエラーを表示|로그인 오류 표시|Anmeldefehler anzeigen|Afficher les erreurs de connexion|Mostrar errores de acceso
重置密码|Reset password|重設密碼|パスワードをリセット|비밀번호 재설정|Passwort zurücksetzen|Réinitialiser le mot de passe|Restablecer contraseña
安全|Security|安全|セキュリティ|보안|Sicherheit|Sécurité|Seguridad
开启两步验证|Enable two-step verification|啟用兩步驟驗證|二段階認証を有効化|2단계 인증 활성화|Zwei-Schritt-Verifizierung aktivieren|Activer la vérification en deux étapes|Activar verificación en dos pasos
资料|Profile|資料|プロフィール|프로필|Profil|Profil|Perfil
使用手机号注册|Sign up with phone|使用手機號碼註冊|電話番号で登録|전화번호로 가입|Mit Telefonnummer registrieren|S’inscrire par téléphone|Registrarse con teléfono
使用手机号登录|Sign in with phone|使用手機號碼登入|電話番号でログイン|전화번호로 로그인|Mit Telefonnummer anmelden|Se connecter par téléphone|Iniciar sesión con teléfono
企业 SSO 登录|Enterprise SSO sign-in|企業 SSO 登入|企業 SSO ログイン|기업 SSO 로그인|Unternehmens-SSO-Anmeldung|Connexion SSO d’entreprise|Inicio de sesión SSO empresarial
企业|Enterprise|企業|企業|기업|Unternehmen|Entreprise|Empresa`;
export const sampleTranslations: Record<string, string[]> = {};
for (const row of rows.split("\n")) {
  const [key, ...values] = row.split("|");
  if (!key || values.length !== languages.length || values.some(value => !value)) throw new Error("Invalid sample translation row");
  sampleTranslations[key] = values;
}
export function createSampleMap(): StoryMapData {
  const map = JSON.parse(JSON.stringify(DEFAULT_MAP)) as StoryMapData;
  const locale = getLocale();
  if (locale === "zh") return map;
  const index = languages.indexOf(locale);
  const translate = (value: string): string => sampleTranslations[value]?.[index] ?? value;
  map.title = translate(map.title);
  map.activities.forEach(item => { item.title = translate(item.title); });
  map.tasks.forEach(item => { item.title = translate(item.title); });
  map.releases.forEach(item => { item.title = translate(item.title); item.subtitle = translate(item.subtitle); });
  map.roles.forEach(item => { item.name = translate(item.name); item.description = translate(item.description); });
  map.stories.forEach(item => {
    item.title = translate(item.title);
    item.description = translate(item.description);
    item.tags = item.tags.map(translate);
    if (item.notePath) item.notePath = `Stories/${item.title}.md`;
  });
  return map;
}
