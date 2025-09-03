'use client';

import React from 'react';
import Link from 'next/link';

export default function ProfilePage() {
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>Business Profile</h1>
      <div style={{ color: '#a7adbb', marginTop: 6 }}>
        Set up your business information to personalize reports and suggestions.
      </div>

      <div
        style={{
          marginTop: 18,
          background: '#141821',
          border: '1px solid #252a34',
          borderRadius: 16,
          padding: 18,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Coming soon</div>
        <div style={{ color: '#a7adbb' }}>
          Weâ€™ll add onboarding questions and saved answers here. These will power report templates,
          AI hints, and follow-up prompts.
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <Link
            href="/generate"
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid #9881b8',
              background: '#9881b8',
              color: '#fff',
              fontWeight: 900,
              textDecoration: 'none',
            }}
          >
            Generate a report
          </Link>
          <Link
            href="/ai-tokens"
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid #e5c564',
              color: '#e5c564',
              fontWeight: 900,
              textDecoration: 'none',
            }}
          >
            Memberships
          </Link>
        </div>
      </div>
    </div>
  );
}

