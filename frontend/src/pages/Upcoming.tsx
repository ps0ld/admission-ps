import { Link } from "react-router-dom";
import { PhasePage } from "../components/PhasePage";

export function Predictor() {
  return (
    <PhasePage
      title="Admission Predictor"
      summary="Enter your qualification and marks, or your JEE rank, and see which colleges you are eligible for and how your past-year cutoffs compare."
      planned={[
        "College finder for 10th pass, 12th pass and diploma students, showing only the fields that apply to you",
        "Eligibility checks kept separate from admission chances, with no guarantees",
        "JEE Main and JEE Advanced predictors built on official JoSAA opening and closing ranks",
        "Diploma lateral-entry finder for B.Tech and related programmes",
      ]}
    >
      <p className="mt-6 rounded-xl bg-marigold-100 p-4 text-sm leading-6 text-ink-700">
        Predictions need official cutoff data to be imported first. Until that data is in the database, this page will
        stay unavailable rather than show invented numbers.
      </p>
    </PhasePage>
  );
}

export function Chat() {
  return (
    <PhasePage
      title="AI Chat"
      summary="Ask admission questions in plain language and get answers grounded in the Admission PS college database."
      planned={[
        "Explains eligibility, JEE and CUET processes, and government versus private options",
        "Suggests colleges from the verified database and remembers the conversation",
        "Saves chat history for signed-in students, kept private to them",
      ]}
    />
  );
}

export function Dashboard() {
  return (
    <PhasePage
      title="Student Dashboard"
      summary="Your saved colleges, predictions, comparisons and chat history in one place."
      planned={[
        "Profile and academic details",
        "Saved colleges and saved comparisons",
        "Previous predictions and searches",
        "Admission updates for the exams you follow",
      ]}
    >
      <p className="mt-6 text-sm text-ink-700">
        The dashboard needs Google sign-in, which is not connected yet.{" "}
        <Link to="/login" className="font-semibold text-peacock-700 hover:underline">
          See the login status
        </Link>
        .
      </p>
    </PhasePage>
  );
}

export function Login() {
  return (
    <PhasePage
      title="Login with Google"
      summary="Sign in to save colleges, predictions and comparisons, and to keep your chat history."
      planned={[
        "Google sign-in through Firebase Authentication",
        "Profile, preferences and account deletion",
        "Private student data protected by server-side checks",
      ]}
    >
      <p className="mt-6 rounded-xl bg-marigold-100 p-4 text-sm leading-6 text-ink-700">
        Sign-in needs a Firebase project, which only the site owner can create. Until its keys are added, comparing
        colleges still works without an account.
      </p>
    </PhasePage>
  );
}
