import axios from "axios";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// NOTE on session isolation from ERP.AUTOVYN.COM:
// This app has its own NextAuth instance and its own AUTH_SECRET (see .env.example).
// NextAuth sets a host-only cookie (no Domain attribute) by default, so a browser
// logged into erp.autovyn.com will never send that cookie to hr.autovyn.com, and
// vice versa — different subdomains are different origins. Using a different
// AUTH_SECRET here is just extra safety on top of that, it is not required by
// itself for isolation.

export const {
  auth,
  signIn,
  signOut,
  handlers: { GET, POST },
} = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      async authorize(credentials) {
        try {
          if (!credentials || !credentials.username || !credentials.password)
            return null;

          // Same backend endpoint ERP uses — data/API stays identical.
          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_URL}/users/login`,
            {
              User_Name: credentials?.username,
              Password: credentials?.password,
              Year: credentials.Year,
              Comp_Code: credentials.Comp_Code,
            },
            {
              headers: {
                compcode: `${credentials.Comp_Code}-${credentials.Year}`,
              },
            }
          );
          const user = res.data;
          if (user?.email) {
            return user;
          }
          return null;
        } catch (err) {
          return null;
        }
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/",
  },
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.DB = user.DB;
        token.Comp_Code = user.Comp_Code || null;
        token.emp_dms_code = user.emp_dms_code || null;
        token.role = user.role as any;
        token.role1 = user.role1 as any;
        token.id = user.id;
        token.multi = user.multi as any;
        token.branch = (user.branch as any) || "";
        token.EMPCODE = (user.EMPCODE as any) || null;
        token.Phy_Loc = (user.Phy_Loc as any) || null;
        token.branchName = user?.branchName || null;
        token.AutoVynRights = user?.AutoVynRights || null;
        token.Deal = user?.Deal || [];
        token.Primary_Branch = user?.Primary_Branch;
        token.shortcuts = user?.shortcuts;
        token.name = user?.name;
      }
      if (trigger === "update") {
        return { ...token, ...session.user };
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session?.user) {
        session.user.branchName = token?.branchName as any;
        session.user.DB = token.DB as any;
        session.user.Comp_Code = (token.Comp_Code as any) || null;
        session.user.role = token.role as any;
        session.user.role1 = token.role1 as any;
        session.user.id = token.id as any;
        session.user.multi = token.multi as any;
        session.user.branch = (token.branch as any) || "";
        session.user.Phy_Loc = (token.Phy_Loc as any) || 0;
        session.user.EMPCODE = (token.EMPCODE as any) || 0;
        session.user.emp_dms_code = (token.emp_dms_code as any) || 0;
        session.user.AutoVynRights = (token.AutoVynRights as any) || 0;
        session.user.Deal = (token.Deal as any) || [];
        session.user.Primary_Branch = token.Primary_Branch as any;
        session.user.shortcuts = token.shortcuts as any;
        session.user.name = (token.name as any) || session.user.name;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 28800,
  },
});
