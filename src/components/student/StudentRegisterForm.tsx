'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Hash,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

const DEPARTMENTS = [
  'Bachelor of Computer Applications (BCA)',
  'Bachelor of Business Administration (BBA)',
  'Information Technology (IT)',
  'Commerce (B.Com)',
  'Arts (B.A.)',
  'Professional Studies',
  'Computer Science',
  'Other',
];

const SEMESTERS = [
  '1st Semester',
  '2nd Semester',
  '3rd Semester',
  '4th Semester',
  '5th Semester',
  '6th Semester',
];

export function StudentRegisterForm({ configured }: { configured: boolean }) {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [collegeRollNumber, setCollegeRollNumber] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [customDepartment, setCustomDepartment] = useState('');
  const [semester, setSemester] = useState(SEMESTERS[0]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      setErrorMessage('Library backend is not configured yet.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic frontend checks
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    const finalDept = department === 'Other' ? customDepartment.trim() : department;
    if (!finalDept) {
      setErrorMessage('Please specify your department.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/student/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          registrationNumber: registrationNumber.trim(),
          collegeRollNumber: collegeRollNumber.trim(),
          department: finalDept,
          semester,
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          confirmPassword,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setErrorMessage(
          result?.error || 'Registration failed. Please check your details.'
        );
        setSubmitting(false);
        return;
      }

      setSuccessMessage(
        'Account created successfully! Signing you into your dashboard...'
      );

      // Attempt immediate login
      try {
        const supabase = getSupabaseBrowserClient();
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (!loginError) {
          router.push('/student/dashboard');
          router.refresh();
          return;
        }
      } catch {
        // Fall back to login page
      }

      router.push('/student/login?registered=1');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Registration failed. Please try again.'
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border border-wine-400/45 bg-wine-700/20 p-3.5 text-xs text-rose-200 flex items-start gap-2.5 backdrop-blur-xl"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-300 mt-0.5" />
          <p className="leading-relaxed">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-500/40 bg-emerald-900/25 p-3.5 text-xs text-emerald-200 flex items-start gap-2.5 backdrop-blur-xl"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
          <p className="leading-relaxed">{successMessage}</p>
        </div>
      )}

      {/* Full Name */}
      <div>
        <label
          htmlFor="reg-fullname"
          className="block text-xs font-semibold text-offwhite-200 mb-1"
        >
          Full Name <span className="text-rose-300">*</span>
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-400" />
          <input
            id="reg-fullname"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Rahul Sharma"
            className="liquid-input pl-9 text-xs"
            disabled={submitting}
          />
        </div>
      </div>

      {/* GU Registration Number & College Roll Number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="reg-guregno"
            className="block text-xs font-semibold text-offwhite-200 mb-1"
          >
            GU Registration No. <span className="text-rose-300">*</span>
          </label>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-400" />
            <input
              id="reg-guregno"
              type="text"
              required
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. 19034567"
              className="liquid-input pl-9 text-xs font-mono uppercase"
              disabled={submitting}
            />
          </div>
          <span className="text-[10px] text-offwhite-400 mt-0.5 block">
            Gauhati University Reg. No.
          </span>
        </div>

        <div>
          <label
            htmlFor="reg-rollno"
            className="block text-xs font-semibold text-offwhite-200 mb-1"
          >
            College Roll No. <span className="text-rose-300">*</span>
          </label>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-400" />
            <input
              id="reg-rollno"
              type="text"
              required
              value={collegeRollNumber}
              onChange={(e) => setCollegeRollNumber(e.target.value)}
              placeholder="e.g. BCA-23-014"
              className="liquid-input pl-9 text-xs font-mono uppercase"
              disabled={submitting}
            />
          </div>
          <span className="text-[10px] text-offwhite-400 mt-0.5 block">
            Dispur College Roll Number
          </span>
        </div>
      </div>

      {/* Department & Semester */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="reg-dept"
            className="block text-xs font-semibold text-offwhite-200 mb-1"
          >
            Department <span className="text-rose-300">*</span>
          </label>
          <div className="relative">
            <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-400" />
            <select
              id="reg-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="liquid-input pl-9 text-xs appearance-none cursor-pointer"
              disabled={submitting}
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="reg-semester"
            className="block text-xs font-semibold text-offwhite-200 mb-1"
          >
            Semester <span className="text-rose-300">*</span>
          </label>
          <div className="relative">
            <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-400" />
            <select
              id="reg-semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="liquid-input pl-9 text-xs appearance-none cursor-pointer"
              disabled={submitting}
            >
              {SEMESTERS.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {department === 'Other' && (
        <div>
          <label
            htmlFor="reg-custom-dept"
            className="block text-xs font-semibold text-offwhite-200 mb-1"
          >
            Specify Department Name <span className="text-rose-300">*</span>
          </label>
          <input
            id="reg-custom-dept"
            type="text"
            required
            value={customDepartment}
            onChange={(e) => setCustomDepartment(e.target.value)}
            placeholder="e.g. Department of Economics"
            className="liquid-input text-xs"
            disabled={submitting}
          />
        </div>
      )}

      {/* Email & Mobile Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="reg-email"
            className="block text-xs font-semibold text-offwhite-200 mb-1"
          >
            Email Address <span className="text-rose-300">*</span>
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-400" />
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="liquid-input pl-9 text-xs"
              disabled={submitting}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="reg-phone"
            className="block text-xs font-semibold text-offwhite-200 mb-1"
          >
            Mobile Number <span className="text-rose-300">*</span>
          </label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-400" />
            <input
              id="reg-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="liquid-input pl-9 text-xs font-mono"
              disabled={submitting}
            />
          </div>
        </div>
      </div>

      {/* Password & Confirm Password */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="reg-password"
            className="block text-xs font-semibold text-offwhite-200 mb-1"
          >
            Password <span className="text-rose-300">*</span>
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-400" />
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="liquid-input pl-9 pr-9 text-xs"
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-offwhite-400 hover:text-offwhite-200 p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="reg-confirmpassword"
            className="block text-xs font-semibold text-offwhite-200 mb-1"
          >
            Confirm Password <span className="text-rose-300">*</span>
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-400" />
            <input
              id="reg-confirmpassword"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="liquid-input pl-9 text-xs"
              disabled={submitting}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="glass-btn-primary w-full py-2.5 text-sm font-semibold mt-3"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-champagne-200" />
            <span>Creating student account...</span>
          </>
        ) : (
          <>
            <GraduationCap className="h-4 w-4 text-champagne-200" />
            <span>Register & Create Account</span>
          </>
        )}
      </button>

      <div className="pt-1 text-center">
        <p className="text-xs text-offwhite-300">
          Already registered?{' '}
          <Link
            href="/student/login"
            className="font-semibold text-champagne-300 hover:text-champagne-200 underline underline-offset-2"
          >
            Sign in to Student Dashboard
          </Link>
        </p>
      </div>
    </form>
  );
}

