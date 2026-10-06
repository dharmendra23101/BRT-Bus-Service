import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAnnounce } from "@/components/a11y/LiveAnnouncer";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LocaleContext";
import { isTranslationKey } from "@/domain/i18n/strings";
import type { TranslationKey } from "@/domain/i18n/en";
import {
	emailSchema,
	fieldErrors,
	signInSchema,
	signUpSchema,
} from "@/domain/validation/schemas";
import { prefetchFirestore } from "@/firebase";
import { useIsMobile } from "@/hooks/use-mobile";

interface FieldProps {
	id: string;
	label: string;
	error?: string;
	children: React.ReactNode;
}

/**
 * A labelled field with its error message wired to the control.
 *
 * Every input previously relied on a placeholder for its name, which
 * disappears the moment the user types and is not reliably announced. A real
 * <label> fixes both (WCAG 3.3.2).
 */
const Field = ({ id, label, error, children }: FieldProps) => {
	const { t } = useTranslation();

	return (
	<div className="w-full mb-3">
		<label htmlFor={id} className="block text-sm font-medium text-foreground mb-1">
			{label}
			<span className="text-destructive" aria-hidden="true">
				{" "}
				*
			</span>
			<span className="sr-only">{t("field.required")}</span>
		</label>

		{children}

		{error && (
			<p id={`${id}-error`} className="text-xs text-destructive mt-1">
				{error}
			</p>
		)}
	</div>
	);
};

/**
 * A validation message as a key, or nothing.
 *
 * Every message these schemas declare is a key. Zod supplies its own English
 * for a rule nobody gave a message to, and that must not reach a passenger as
 * `validation.email.required` - so anything unrecognised becomes the generic
 * one rather than being rendered raw.
 */
const asKey = (message: string | undefined): TranslationKey | "" => {
	if (!message) return "";

	return isTranslationKey(message) ? message : "validation.generic";
};

const inputClass = (hasError: boolean) =>
	`w-full bg-secondary rounded-lg px-4 py-2.5 border-2 transition-colors ${
		hasError ? "border-destructive" : "border-transparent focus:border-primary"
	}`;

const Login = () => {
	// Redirecting an already-signed-in visitor is the route guard's job.
	const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
	const announce = useAnnounce();
	const { t } = useTranslation();

	/*
		Errors travel as keys and become words here. The schema that detects a
		problem and the mapper that classifies an auth failure both run in a
		domain with no idea which language anybody is reading in.
	*/
	const say = (key: TranslationKey | "") => (key ? t(key) : "");

	/**
	 * Only one layout is mounted at a time.
	 *
	 * Rendering both and hiding one with CSS would put every field id in the
	 * document twice, which silently breaks the label/input associations and
	 * confuses password managers.
	 */
	const isMobile = useIsMobile();

	/*
		Someone on this page is about to need Firestore, so its chunk is
		fetched during idle time. Prefetching it globally would push 243 kB
		onto every visitor who only ever reads the timetable.
	*/
	useEffect(() => prefetchFirestore(), []);

	const [isSignUpView, setIsSignUpView] = useState(false);
	const [isResetView, setIsResetView] = useState(false);

	const [signInEmail, setSignInEmail] = useState("");
	const [signInPass, setSignInPass] = useState("");
	const [showSignInPass, setShowSignInPass] = useState(false);
	const [signInEmailError, setSignInEmailError] = useState<TranslationKey | "">("");
	const [signInPassError, setSignInPassError] = useState<TranslationKey | "">("");

	const [signUpName, setSignUpName] = useState("");
	const [signUpEmail, setSignUpEmail] = useState("");
	const [signUpPass, setSignUpPass] = useState("");
	const [showSignUpPass, setShowSignUpPass] = useState(false);
	const [signUpNameError, setSignUpNameError] = useState<TranslationKey | "">("");
	const [signUpEmailError, setSignUpEmailError] = useState<TranslationKey | "">("");
	const [signUpPassError, setSignUpPassError] = useState<TranslationKey | "">("");

	const [resetEmail, setResetEmail] = useState("");
	const [resetEmailError, setResetEmailError] = useState<TranslationKey | "">("");
	const [resetSent, setResetSent] = useState(false);

	const [error, setError] = useState<TranslationKey | "">("");
	const [loadingAuth, setLoadingAuth] = useState(false);

	const ids = useId();
	const signInEmailId = `${ids}-signin-email`;
	const signInPassId = `${ids}-signin-password`;
	const signUpNameId = `${ids}-signup-name`;
	const signUpEmailId = `${ids}-signup-email`;
	const signUpPassId = `${ids}-signup-password`;
	const resetEmailId = `${ids}-reset-email`;

	const signInEmailRef = useRef<HTMLInputElement>(null);
	const signInPassRef = useRef<HTMLInputElement>(null);
	const signUpNameRef = useRef<HTMLInputElement>(null);
	const signUpEmailRef = useRef<HTMLInputElement>(null);
	const signUpPassRef = useRef<HTMLInputElement>(null);
	const resetEmailRef = useRef<HTMLInputElement>(null);

	const handleSignIn = async (event: FormEvent) => {
		event.preventDefault();

		setSignInEmailError("");
		setSignInPassError("");
		setError("");

		const parsed = signInSchema.safeParse({ email: signInEmail, password: signInPass });

		if (!parsed.success) {
			const errors = fieldErrors(parsed.error);
			setSignInEmailError(asKey(errors.email));
			setSignInPassError(asKey(errors.password));

			// Focus the first field that failed, so a keyboard user lands on
			// the thing they need to fix rather than hunting for it.
			if (errors.email) signInEmailRef.current?.focus();
			else if (errors.password) signInPassRef.current?.focus();

			announce(t("login.announce.signInProblem"), "assertive");
			return;
		}

		setLoadingAuth(true);
		announce(t("login.announce.signingIn"));

		const message = await signIn(parsed.data.email, parsed.data.password);

		setLoadingAuth(false);

		if (message) {
			setError(message);
			announce(t(message), "assertive");
		}
	};

	const handleSignUp = async (event: FormEvent) => {
		event.preventDefault();

		setSignUpNameError("");
		setSignUpEmailError("");
		setSignUpPassError("");
		setError("");

		const parsed = signUpSchema.safeParse({
			name: signUpName,
			email: signUpEmail,
			password: signUpPass,
		});

		if (!parsed.success) {
			const errors = fieldErrors(parsed.error);
			setSignUpNameError(asKey(errors.name));
			setSignUpEmailError(asKey(errors.email));
			setSignUpPassError(asKey(errors.password));

			if (errors.name) signUpNameRef.current?.focus();
			else if (errors.email) signUpEmailRef.current?.focus();
			else if (errors.password) signUpPassRef.current?.focus();

			announce(t("login.announce.signUpProblem"), "assertive");
			return;
		}

		setLoadingAuth(true);
		announce(t("login.announce.creating"));

		const message = await signUp(parsed.data.name, parsed.data.email, parsed.data.password);

		setLoadingAuth(false);

		if (message) {
			setError(message);
			announce(t(message), "assertive");
		}
	};

	const handleReset = async (event: FormEvent) => {
		event.preventDefault();

		setResetEmailError("");
		setError("");

		const parsed = emailSchema.safeParse(resetEmail);

		if (!parsed.success) {
			setResetEmailError(asKey(parsed.error.issues[0]?.message));
			resetEmailRef.current?.focus();
			announce(t("login.announce.resetProblem"), "assertive");
			return;
		}

		setLoadingAuth(true);

		const message = await resetPassword(parsed.data);

		setLoadingAuth(false);

		if (message) {
			setError(message);
			announce(t(message), "assertive");
			return;
		}

		setResetSent(true);
		announce(t("login.announce.resetSent"));
	};

	const handleGoogleLogin = async () => {
		setError("");
		setLoadingAuth(true);

		const message = await signInWithGoogle();

		setLoadingAuth(false);

		if (message) {
			setError(message);
			announce(t(message), "assertive");
		}
	};

	const showReset = (show: boolean) => {
		setIsResetView(show);
		setResetSent(false);
		setResetEmail("");
		setResetEmailError("");
		setError("");
	};

	const switchView = (toSignUp: boolean) => {
		setIsSignUpView(toSignUp);
		setIsResetView(false);
		setResetSent(false);
		setResetEmailError("");
		setError("");
		setSignInEmailError("");
		setSignInPassError("");
		setSignUpNameError("");
		setSignUpEmailError("");
		setSignUpPassError("");
	};

	const errorBanner = error ? (
		<div className="w-full mb-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg" role="alert">
			<p className="text-xs text-destructive text-center">{say(error)}</p>
		</div>
	) : null;

	const passwordToggle = (shown: boolean, onToggle: () => void) => (
		<button
			type="button"
			onClick={onToggle}
			className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
			aria-label={shown ? t("login.hidePassword") : t("login.showPassword")}
			aria-pressed={shown}
		>
			{shown ? (
				<EyeOff className="w-4 h-4" aria-hidden="true" />
			) : (
				<Eye className="w-4 h-4" aria-hidden="true" />
			)}
		</button>
	);

	const signInForm = (
		<form onSubmit={handleSignIn} noValidate className="w-full flex flex-col items-center">
			<h1 className="text-2xl font-bold mb-3">{t("login.signIn.title")}</h1>

			{errorBanner}

			<Field id={signInEmailId} label={t("login.email")} error={say(signInEmailError)}>
				<input
					ref={signInEmailRef}
					id={signInEmailId}
					type="email"
					inputMode="email"
					autoComplete="email"
					required
					aria-invalid={signInEmailError ? true : undefined}
					aria-describedby={signInEmailError ? `${signInEmailId}-error` : undefined}
					value={signInEmail}
					onChange={(e) => {
						setSignInEmail(e.target.value);
						setSignInEmailError("");
					}}
					className={inputClass(!!signInEmailError)}
				/>
			</Field>

			<Field id={signInPassId} label={t("login.password")} error={say(signInPassError)}>
				<div className="relative">
					<input
						ref={signInPassRef}
						id={signInPassId}
						type={showSignInPass ? "text" : "password"}
						autoComplete="current-password"
						required
						aria-invalid={signInPassError ? true : undefined}
						aria-describedby={signInPassError ? `${signInPassId}-error` : undefined}
						value={signInPass}
						onChange={(e) => {
							setSignInPass(e.target.value);
							setSignInPassError("");
						}}
						className={`${inputClass(!!signInPassError)} pr-12`}
					/>
					{passwordToggle(showSignInPass, () => setShowSignInPass((v) => !v))}
				</div>
			</Field>

			<button
				type="submit"
				disabled={loadingAuth}
				className="w-full bg-primary text-primary-foreground px-10 py-2.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity touch-target inline-flex items-center justify-center gap-2"
			>
				{loadingAuth && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
				{loadingAuth ? t("login.signIn.pending") : t("login.signIn.action")}
			</button>

			<button
				type="button"
				onClick={handleGoogleLogin}
				disabled={loadingAuth}
				className="w-full mt-3 border-2 border-border px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary transition-colors flex items-center justify-center gap-2 touch-target"
			>
				<span aria-hidden="true">🔵</span>
				{t("login.google")}
			</button>
			<button
				type="button"
				onClick={() => showReset(true)}
				className="mt-3 text-sm font-semibold text-primary underline underline-offset-2"
			>
				{t("login.forgot")}
			</button>
		</form>
	);

	const resetForm = (
		<form onSubmit={handleReset} noValidate className="w-full flex flex-col items-center">
			<h1 className="text-2xl font-bold mb-3">{t("login.reset.title")}</h1>

			{errorBanner}

			{resetSent ? (
				<>
					<p className="w-full mb-4 text-sm text-muted-foreground text-center" role="status">
						{t("login.reset.sent", { email: resetEmail })}
					</p>

					<button
						type="button"
						onClick={() => showReset(false)}
						className="w-full bg-primary text-primary-foreground px-10 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity touch-target"
					>
						{t("login.backToSignIn")}
					</button>
				</>
			) : (
				<>
					<p className="w-full mb-3 text-sm text-muted-foreground text-center">
						{t("login.reset.intro")}
					</p>

					<Field id={resetEmailId} label={t("login.email")} error={say(resetEmailError)}>
						<input
							ref={resetEmailRef}
							id={resetEmailId}
							type="email"
							inputMode="email"
							autoComplete="email"
							required
							aria-invalid={resetEmailError ? true : undefined}
							aria-describedby={resetEmailError ? `${resetEmailId}-error` : undefined}
							value={resetEmail}
							onChange={(e) => {
								setResetEmail(e.target.value);
								setResetEmailError("");
							}}
							className={inputClass(!!resetEmailError)}
						/>
					</Field>

					<button
						type="submit"
						disabled={loadingAuth}
						className="w-full bg-primary text-primary-foreground px-10 py-2.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity touch-target inline-flex items-center justify-center gap-2"
					>
						{loadingAuth && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
						{loadingAuth ? t("login.reset.pending") : t("login.reset.action")}
					</button>

					<button
						type="button"
						onClick={() => showReset(false)}
						className="mt-3 text-sm font-semibold text-primary underline underline-offset-2"
					>
						{t("login.backToSignIn")}
					</button>
				</>
			)}
		</form>
	);

	const signUpForm = (
		<form onSubmit={handleSignUp} noValidate className="w-full flex flex-col items-center">
			<h1 className="text-2xl font-bold mb-3">{t("login.signUp.title")}</h1>

			{errorBanner}

			<Field id={signUpNameId} label={t("login.name")} error={say(signUpNameError)}>
				<input
					ref={signUpNameRef}
					id={signUpNameId}
					type="text"
					autoComplete="name"
					required
					aria-invalid={signUpNameError ? true : undefined}
					aria-describedby={signUpNameError ? `${signUpNameId}-error` : undefined}
					value={signUpName}
					onChange={(e) => {
						setSignUpName(e.target.value);
						setSignUpNameError("");
					}}
					className={inputClass(!!signUpNameError)}
				/>
			</Field>

			<Field id={signUpEmailId} label={t("login.email")} error={say(signUpEmailError)}>
				<input
					ref={signUpEmailRef}
					id={signUpEmailId}
					type="email"
					inputMode="email"
					autoComplete="email"
					required
					aria-invalid={signUpEmailError ? true : undefined}
					aria-describedby={signUpEmailError ? `${signUpEmailId}-error` : undefined}
					value={signUpEmail}
					onChange={(e) => {
						setSignUpEmail(e.target.value);
						setSignUpEmailError("");
					}}
					className={inputClass(!!signUpEmailError)}
				/>
			</Field>

			<Field id={signUpPassId} label={t("login.password")} error={say(signUpPassError)}>
				<div className="relative">
					<input
						ref={signUpPassRef}
						id={signUpPassId}
						type={showSignUpPass ? "text" : "password"}
						autoComplete="new-password"
						required
						aria-invalid={signUpPassError ? true : undefined}
						aria-describedby={
							signUpPassError ? `${signUpPassId}-error` : `${signUpPassId}-hint`
						}
						value={signUpPass}
						onChange={(e) => {
							setSignUpPass(e.target.value);
							setSignUpPassError("");
						}}
						className={`${inputClass(!!signUpPassError)} pr-12`}
					/>
					{passwordToggle(showSignUpPass, () => setShowSignUpPass((v) => !v))}
				</div>
			</Field>

			{!signUpPassError && (
				<p id={`${signUpPassId}-hint`} className="w-full -mt-2 mb-3 text-xs text-muted-foreground">
					{t("login.passwordHint")}
				</p>
			)}

			<button
				type="submit"
				disabled={loadingAuth}
				className="w-full bg-primary text-primary-foreground px-10 py-2.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity touch-target inline-flex items-center justify-center gap-2"
			>
				{loadingAuth && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
				{loadingAuth ? t("login.signUp.pending") : t("login.signUp.action")}
			</button>
		</form>
	);

	return (
		<div
			className="login-font min-h-screen"
			style={{
				background: "linear-gradient(to right, hsl(var(--secondary)), hsl(var(--surface-raised)))",
			}}
		>
			<main
				id="main-content"
				tabIndex={-1}
				className="flex items-center justify-center min-h-screen px-4 py-10"
			>
				{/*
					Two layouts, one set of forms, only ever one mounted.

					Below md the sliding two-panel design leaves each half about
					107px wide on a 375px phone, so the small-screen layout is a
					single full-width column. The desktop presentation is unchanged.
				*/}

				{isMobile ? (
					<div className="w-full max-w-md bg-card rounded-3xl p-6 sm:p-8 shadow-lg">
						{isSignUpView ? signUpForm : isResetView ? resetForm : signInForm}

						{!isResetView && (
							<p className="text-center text-sm text-muted-foreground mt-6">
								{isSignUpView ? t("login.haveAccount") : t("login.noAccount")}{" "}
								<button
									type="button"
									onClick={() => switchView(!isSignUpView)}
									className="font-semibold text-primary underline underline-offset-2"
								>
									{isSignUpView ? t("login.signIn.action") : t("login.signUp.action")}
								</button>
							</p>
						)}
					</div>
				) : (
				<div className="relative bg-card rounded-[30px] overflow-hidden w-full max-w-[768px] min-h-[520px] shadow-lg">
					{/*
						The off-screen panel keeps its fields out of the tab order.
						`pointer-events-none` alone would still leave them tabbable.
					*/}
					<div
						className={`absolute top-0 left-0 w-1/2 h-full flex flex-col items-center justify-center px-10 transition-[transform,opacity] duration-settle ${
							isSignUpView ? "translate-x-full opacity-100 z-[5]" : "opacity-0 z-[1] pointer-events-none"
						}`}
					>
						{isSignUpView && signUpForm}
					</div>

					<div
						className={`absolute top-0 left-0 w-1/2 h-full flex flex-col items-center justify-center px-10 transition-[transform,opacity] duration-settle z-[2] ${
							isSignUpView ? "-translate-x-full opacity-0 pointer-events-none" : ""
						}`}
					>
						{!isSignUpView && (isResetView ? resetForm : signInForm)}
					</div>

					<div
						className={`absolute top-0 left-1/2 w-1/2 h-full overflow-hidden rounded-l-[150px] transition-[transform,border-radius] duration-settle z-[100] ${
							isSignUpView ? "-translate-x-full rounded-l-none rounded-r-[150px]" : ""
						}`}
					>
						<div className="h-full flex items-center justify-center px-8 text-center text-white bg-primary">
							{!isSignUpView ? (
								<div>
									<h2 className="text-2xl font-bold mb-3">{t("login.aside.newTitle")}</h2>
									<p className="text-sm mb-4 text-white/90">
										{t("login.aside.newBody")}
									</p>
									<button
										type="button"
										onClick={() => switchView(true)}
										className="border border-white px-10 py-2.5 rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors duration-enter touch-target"
									>
										{t("login.signUp.action")}
									</button>
								</div>
							) : (
								<div>
									<h2 className="text-2xl font-bold mb-3">{t("login.aside.returningTitle")}</h2>
									<p className="text-sm mb-4 text-white/90">
										{t("login.aside.returningBody")}
									</p>
									<button
										type="button"
										onClick={() => switchView(false)}
										className="border border-white px-10 py-2.5 rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors duration-enter touch-target"
									>
										{t("login.signIn.action")}
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
				)}
			</main>
		</div>
	);
};

export default Login;
