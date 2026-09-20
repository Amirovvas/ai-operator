import "./appSidebar.css";
import Link from "next/link";
import { CiUser } from "react-icons/ci";
import { HiOutlineUsers, HiOutlineCurrencyDollar } from "react-icons/hi2";
import { useState } from "react";
import { IoLogOutOutline, IoCheckboxOutline } from "react-icons/io5";
import { MdOutlineDashboard } from "react-icons/md";
import { MdOutlineMail } from "react-icons/md";
import { CiCalendar } from "react-icons/ci";
import { CiHardDrive } from "react-icons/ci";
import { AiFillRobot } from "react-icons/ai";
import { IoNewspaperOutline } from "react-icons/io5";
import { TbSquareLetterJFilled } from "react-icons/tb";
import { useLogout } from "@/hooks/auth/useLogout";
import { useProfile } from "@/hooks/auth/useProfile";
import { UserAvatar } from "../UserAvatar";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export const AppSidebar = () => {
  const { mutate: logout } = useLogout();
  const { data: profile } = useProfile();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sidebar className="sidebar">
      <SidebarContent className="main">
        <div className="sidebar-title">
          <div className="ai-logo">AI</div>
          <span>AI Operator 2.0</span>
        </div>

        <div className="menu">
          <SidebarMenuButton className="btn" render={<Link href="/" />}>
            <span className="icon-placeholder">
              <MdOutlineDashboard />
            </span>
            <span>Dashboard</span>
          </SidebarMenuButton>

          <SidebarMenuButton className="btn" render={<Link href="/gmail" />}>
            <span className="icon-placeholder">
              <MdOutlineMail />
            </span>
            <span>Gmail</span>
          </SidebarMenuButton>

          <SidebarMenuButton className="btn" render={<Link href="/calendar" />}>
            <span className="icon-placeholder">
              <CiCalendar />
            </span>
            <span>Calendar</span>
          </SidebarMenuButton>

          <SidebarMenuButton className="btn" render={<Link href="/drive" />}>
            <span className="icon-placeholder">
              <CiHardDrive />
            </span>
            <span>Drive</span>
          </SidebarMenuButton>

          <SidebarMenuButton className="btn" render={<Link href="/contacts" />}>
            <span className="icon-placeholder">
              <HiOutlineUsers />
            </span>
            <span>Contacts</span>
          </SidebarMenuButton>

          <SidebarMenuButton className="btn" render={<Link href="/deals" />}>
            <span className="icon-placeholder">
              <HiOutlineCurrencyDollar />
            </span>
            <span>Deals</span>
          </SidebarMenuButton>

          <SidebarMenuButton className="btn" render={<Link href="/notes" />}>
            <span className="icon-placeholder">
              <IoNewspaperOutline />
            </span>
            <span>Notes</span>
          </SidebarMenuButton>

          <SidebarMenuButton className="btn" render={<Link href="/tasks" />}>
            <span className="icon-placeholder">
              <IoCheckboxOutline />
            </span>
            <span>Tasks</span>
          </SidebarMenuButton>

          <SidebarMenuButton className="btn" render={<Link href="/aiChat" />}>
            <span className="icon-placeholder">
              <AiFillRobot />
            </span>
            <span>AI Chat</span>
          </SidebarMenuButton>
        </div>
      </SidebarContent>

      <SidebarFooter className="sidebar-footer">
        <div
          className="user-container"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {isOpen && (
            <div className="user-popup">
              <Link href="/profile" className="popup-item">
                <span className="popup-icon">
                  <CiUser />
                </span>
                Profile
              </Link>

              <button onClick={() => logout()} className="popup-item logout">
                <span className="popup-icon">
                  <IoLogOutOutline />
                </span>
                Logout
              </button>
            </div>
          )}

          <div className="user-card">
            <div className="user-avatar">
              <UserAvatar
                className="avatar-img"
                avatar={profile?.avatar}
                name={profile?.name}
              />
            </div>

            <div className="user-info">
              <span className="username">{profile?.name || "Guest"}</span>
              <span className="email">{profile?.email || ""}</span>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
