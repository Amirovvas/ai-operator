"use client";
import { useProfile } from "@/hooks/auth/useProfile";
import css from "./profile.module.css";
import { useLogout } from "@/hooks/auth/useLogout";
import { UserAvatar } from "@/components/layout/UserAvatar";

const Profile = () => {
  const { data: profile } = useProfile();
  const { mutate: logout } = useLogout();
  return (
    <div className={css.container}>
      <div className={css.profileCard}>
        <div className={css.header}>
          <div>
            <h1>My Profile</h1>
            <p>Manage your personal information and account settings.</p>
          </div>

          <button className={css.editBtn}>Edit Profile</button>
        </div>

        <div className={css.profileInfo}>
          <UserAvatar
            className={css.avatar}
            avatar={profile?.avatar}
            name={profile?.name}
          />

          <div className={css.profileName}>
            <h2>{profile?.name}</h2>
            <p className={css.email}>{profile?.email}</p>

            <span className={css.status}>Active account</span>
          </div>
        </div>

        <div className={css.divider}></div>

        <section className={css.section}>
          <h3>Personal Information</h3>

          <div className={css.details}>
            <div className={css.detail}>
              <span>First Name</span>
              <p>{profile?.name}</p>
            </div>

            <div className={css.detail}>
              <span>Last Name</span>
              <p>Smith</p>
            </div>

            <div className={css.detail}>
              <span>Email</span>
              <p>{profile?.email}</p>
            </div>

            <div className={css.detail}>
              <span>Phone</span>
              <p>+996 555 123 456</p>
            </div>
          </div>
        </section>

        <div className={css.divider}></div>

        <section className={css.section}>
          <h3>Account</h3>

          <div className={css.accountItem}>
            <div className={css.googleIcon}>G</div>

            <div className={css.accountText}>
              <strong>Google Account</strong>
              <span>Sign in with your Google account</span>
            </div>

            <span className={css.connected}>
              {profile?.google_id && "Connected"}
            </span>
          </div>

          <div className={css.accountItem}>
            <div className={css.securityIcon}>•</div>

            <div className={css.accountText}>
              <strong>Password</strong>
              <span>Your account password is protected</span>
            </div>

            <button className={css.changeBtn}>Change</button>
          </div>
        </section>

        <div className={css.divider}></div>

        <section className={css.dangerSection}>
          <h3>Account Actions</h3>

          <div className={css.actions}>
            <button onClick={() => logout()} className={css.logoutBtn}>
              Log Out
            </button>

          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
