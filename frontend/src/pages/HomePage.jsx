import GlobalChat from "../components/GlobalChat";
import { useProfileModalStore } from "../store/useProfileModalStore";

const HomePage = () => {
  const { openProfile } = useProfileModalStore();

  return (
    <div className="p-1.5 sm:p-4 lg:p-5 pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))] sm:pb-4 flex-1 flex flex-col h-full min-h-0">
      <div className="container mx-auto flex-1 flex flex-col h-full min-h-0">
        {/* GLOBAL CHAT */}
        <section className="flex-1 flex flex-col h-full min-h-0">
          <GlobalChat onSelectUser={(id) => openProfile(id)} />
        </section>
      </div>
    </div>
  );
};

export default HomePage;
