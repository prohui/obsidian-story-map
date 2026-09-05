import type { StoryMapData } from "./types";

export const DEFAULT_MAP: StoryMapData = {
  version: 1,
  title: "进入系统的用户旅程",
  zoom: 1,
  activities: [
    { id: "entry", title: "进入系统" },
    { id: "security", title: "账户与安全" },
    { id: "profile", title: "个人资料管理" },
    { id: "notice", title: "通知管理" }
  ],
  tasks: [
    { id: "signup", title: "注册账号", activityId: "entry" },
    { id: "login", title: "登录账号", activityId: "entry" },
    { id: "password", title: "密码管理", activityId: "security" },
    { id: "verify", title: "二次验证", activityId: "security" },
    { id: "edit-profile", title: "编辑个人资料", activityId: "profile" },
    { id: "avatar", title: "更换头像", activityId: "profile" },
    { id: "notice-settings", title: "通知设置", activityId: "notice" }
  ],
  releases: [
    { id: "mvp", title: "MVP", subtitle: "核心价值" },
    { id: "v1", title: "版本 1", subtitle: "增强体验" },
    { id: "later", title: "以后", subtitle: "未来规划" }
  ],
  roles: [
    { id: "visitor", name: "访客", description: "尚未注册或登录的用户" },
    { id: "member", name: "注册用户", description: "已创建账号的普通用户" },
    { id: "admin", name: "管理员", description: "负责账号和安全管理" }
  ],
  stories: [
    { id: "s1", title: "使用邮箱注册", activityId: "entry", taskId: "signup", releaseId: "mvp", description: "新用户可以使用邮箱地址创建账号。", status: "planned", priority: "high", estimate: 5, tags: ["注册", "邮箱"], notePath: "故事/使用邮箱注册.md", color: "lavender" },
    { id: "s2", title: "验证邮箱", activityId: "entry", taskId: "signup", releaseId: "mvp", description: "", status: "planned", priority: "high", estimate: 3, tags: ["注册", "验证"], color: "yellow" },
    { id: "s10", title: "设置密码", activityId: "entry", taskId: "signup", releaseId: "mvp", description: "", status: "planned", priority: "medium", estimate: 3, tags: ["注册"], color: "blue" },
    { id: "s11", title: "使用邮箱登录", activityId: "entry", taskId: "login", releaseId: "mvp", description: "注册用户可以使用邮箱地址和密码进入系统。", status: "planned", priority: "high", estimate: 5, tags: ["登录", "邮箱"], notePath: "故事/使用邮箱登录.md", color: "lavender" },
    { id: "s12", title: "保持登录状态", activityId: "entry", taskId: "login", releaseId: "mvp", description: "", status: "planned", priority: "medium", estimate: 3, tags: ["登录"], color: "green" },
    { id: "s13", title: "显示登录失败原因", activityId: "entry", taskId: "login", releaseId: "mvp", description: "", status: "planned", priority: "medium", estimate: 2, tags: ["登录"], color: "yellow" },
    { id: "s3", title: "重置密码", activityId: "security", taskId: "password", releaseId: "mvp", description: "", status: "doing", priority: "high", estimate: 3, tags: ["安全"], color: "blue" },
    { id: "s4", title: "开启两步验证", activityId: "security", taskId: "verify", releaseId: "mvp", description: "", status: "idea", priority: "medium", estimate: 5, tags: ["安全"], color: "yellow" },
    { id: "s5", title: "编辑个人资料", activityId: "profile", taskId: "edit-profile", releaseId: "mvp", description: "", status: "planned", priority: "medium", estimate: 3, tags: ["资料"], color: "blue" },
    { id: "s6", title: "更换头像", activityId: "profile", taskId: "avatar", releaseId: "mvp", description: "", status: "idea", priority: "low", estimate: 2, tags: ["资料"], color: "green" },
    { id: "s7", title: "使用手机号注册", activityId: "entry", taskId: "signup", releaseId: "v1", description: "", status: "idea", priority: "medium", estimate: 5, tags: ["注册"], color: "blue" },
    { id: "s8", title: "使用手机号登录", activityId: "entry", taskId: "login", releaseId: "v1", description: "", status: "idea", priority: "medium", estimate: 5, tags: ["登录"], color: "green" },
    { id: "s9", title: "企业 SSO 登录", activityId: "entry", taskId: "login", releaseId: "later", description: "", status: "idea", priority: "low", estimate: 13, tags: ["企业"], color: "blue" }
  ]
};
