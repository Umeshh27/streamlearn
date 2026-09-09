import { Link } from "react-router";
import { LANGUAGE_TO_FLAG } from "../constants";
import { getNameStyle, getNameClass } from "../lib/utils";

const FriendCard = ({ friend }) => {
  return (
    <div className="card bg-base-200 hover:shadow-md transition-shadow border border-base-300">
      <div className="card-body p-4">
        {/* USER INFO */}
        <div className="flex items-center gap-3 mb-3">
          <div className="avatar size-12 rounded-full overflow-hidden ring-2 ring-primary/40">
            {friend.profilePic ? (
              <img src={friend.profilePic} alt={friend.fullName} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary text-primary-content font-bold text-base">
                {friend.fullName?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
          </div>
          <h3
            className={`font-bold truncate ${
              friend.nameColor ? getNameClass(friend.nameColor) : "text-base-content"
            }`}
            style={friend.nameColor ? getNameStyle(friend.nameColor) : {}}
          >
            {friend.fullName}
          </h3>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="badge badge-secondary text-secondary-content font-bold text-xs py-2">
            {getLanguageFlag(friend.nativeLanguage)}
            Native: {friend.nativeLanguage}
          </span>
          <span className="badge badge-outline border-base-300 font-bold text-xs py-2 text-base-content">
            {getLanguageFlag(friend.learningLanguage)}
            Learning: {friend.learningLanguage}
          </span>
        </div>

        <Link to={`/chat/${friend._id}`} className="btn btn-primary text-primary-content font-bold w-full shadow-xs">
          Message
        </Link>
      </div>
    </div>
  );
};
export default FriendCard;

export function getLanguageFlag(language) {
  if (!language) return null;

  const langLower = language.toLowerCase();
  const countryCode = LANGUAGE_TO_FLAG[langLower];

  if (countryCode) {
    return (
      <img
        src={`https://flagcdn.com/24x18/${countryCode}.png`}
        alt={`${langLower} flag`}
        className="h-3 mr-1 inline-block"
      />
    );
  }
  return null;
}
