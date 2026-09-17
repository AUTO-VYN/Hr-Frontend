'use client';
import React from 'react';
import { FormDataProvider } from './Shortlisted_Candidate/Context/FormDataContext';

export default function RecruitmentProcessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FormDataProvider>{children}</FormDataProvider>;
}
