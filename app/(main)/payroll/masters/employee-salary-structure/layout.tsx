'use client';
import React from 'react';
import { FormDataProvider } from '../Employee_Master/Context/FormDataContext';

export default function SalaryStructureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FormDataProvider>{children}</FormDataProvider>;
}
