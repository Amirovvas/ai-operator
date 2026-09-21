import "./appSidebar.css";
import Link from "next/link";
import { CiUser } from "react-icons/ci";
import { HiOutlineUsers, HiOutlineCurrencyDollar } from "react-icons/hi2";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { IoLogOutOutline, IoCheckboxOutline } from "react-icons/io5";
import { MdOutlineDashboard } from "react-icons/md";
import { MdOutlineMail } from "react-icons/md";
import { CiCalendar } from "react-icons/ci";
import { CiHardDrive } from "react-icons/ci";
import { AiFillRobot } from "react-icons/ai";
import { IoNewspaperOutline } from "react-icons/io5";
import { useLogout } from "@/hooks/auth/useLogout";
import { useProfile } from "@/hooks/auth/useProfile";
import { UserAvatar } from "../UserAvatar";
import { LogoMark } from "../Logo";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

export const AppSidebar = () => {
  const { mutate: logout } = useLogout();
  const { data: profile } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const userRef = useRef<HTMLDivElement>(null);
  const lastPointer = useRef("mouse");

  // подсветка текущей страницы (раньше её изображал :focus, который на телефоне
  // залипал на первом пункте шторки)
  const navClass = (href: string) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return active ? "btn active" : "btn";
  };

  // на телефоне меню открывается как шторка — после перехода на страницу закрываем
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  // на тач-экранах нет hover: меню пользователя открывается тапом,
  // а тап вне него закрывает
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!userRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  return (
    <Sidebar className="sidebar">
      <SidebarContent className="main">
        <div className="sidebar-title">
          <div className="ai-logo">
            <LogoMark size={18} />
          </div>
          <span>AI Operator 2.0</span>
        </div>

        <div className="menu">
          <SidebarMenuButton className={navClass("/")} render={<Link href="/" />}>
            <span className="icon-placeholder">
              <MdOutlineDashboard />
            </span>
            <span>Dashboard</span>
          </SidebarMenuButton>

          <SidebarMenuButton className={navClass("/gmail")} render={<Link href="/gmail" />}>
            <span className="icon-placeholder">
              <MdOutlineMail />
            </span>
            <span>Gmail</span>
          </SidebarMenuButton>

          <SidebarMenuButton className={navClass("/calendar")} render={<Link href="/calendar" />}>
            <span className="icon-placeholder">
              <CiCalendar />
            </span>
            <span>Calendar</span>
          </SidebarMenuButton>

          <SidebarMenuButton className={navClass("/drive")} render={<Link href="/drive" />}>
            <span className="icon-placeholder">
              <CiHardDrive />
            </span>
            <span>Drive</span>
          </SidebarMenuButton>

          <SidebarMenuButton className={navClass("/contacts")} render={<Link href="/contacts" />}>
            <span className="icon-placeholder">
              <HiOutlineUsers />
            </span>
            <span>Contacts</span>
          </SidebarMenuButton>

          <SidebarMenuButton className={navClass("/deals")} render={<Link href="/deals" />}>
            <span className="icon-placeholder">
              <HiOutlineCurrencyDollar />
            </span>
            <span>Deals</span>
          </SidebarMenuButton>

          <SidebarMenuButton className={navClass("/notes")} render={<Link href="/notes" />}>
            <span className="icon-placeholder">
              <IoNewspaperOutline />
            </span>
            <span>Notes</span>
          </SidebarMenuButton>

          <SidebarMenuButton className={navClass("/tasks")} render={<Link href="/tasks" />}>
            <span className="icon-placeholder">
              <IoCheckboxOutline />
            </span>
            <span>Tasks</span>
          </SidebarMenuButton>

          <SidebarMenuButton className={navClass("/aiChat")} render={<Link href="/aiChat" />}>
            <span className="icon-placeholder">
              <AiFillRobot />
            </span>
            <span>AI Chat</span>
          </SidebarMenuButton>
        </div>
      </SidebarContent>

      <SidebarFooter className="sidebar-footer">
        <div
          ref={userRef}
          className="user-container"
          onPointerDown={(event) => {
            lastPointer.current = event.pointerType;
          }}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setIsOpen(true);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setIsOpen(false);
          }}
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

          <div
            className="user-card"
            onClick={() =>
              // мышь уже открыла меню по hover, тач — переключает
              setIsOpen((open) => (lastPointer.current === "mouse" ? true : !open))
            }
          >
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
