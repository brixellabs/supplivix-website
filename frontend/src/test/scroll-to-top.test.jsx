import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Link, Routes, Route } from 'react-router-dom';
import ScrollToTop from '../components/common/ScrollToTop';

describe('ScrollToTop and Page Header Visibility Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls window.scrollTo(0, 0) upon initial page render', () => {
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollToTop />
        <div>Home Page Content</div>
      </MemoryRouter>
    );

    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0, left: 0 })
    );
  });

  it('resets scroll to top when navigating to another page so page header is visible', () => {
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    function TestApp() {
      return (
        <MemoryRouter initialEntries={['/']}>
          <ScrollToTop />
          <nav>
            <Link to="/about">Go to About</Link>
          </nav>
          <Routes>
            <Route path="/" element={<h1>Home Header</h1>} />
            <Route path="/about" element={<h1>About Page Header</h1>} />
          </Routes>
        </MemoryRouter>
      );
    }

    render(<TestApp />);
    expect(scrollToMock).toHaveBeenCalledTimes(1);

    // Click link to navigate to another page
    const link = screen.getByText('Go to About');
    act(() => {
      link.click();
    });

    // Verify window.scrollTo was called again on route change
    expect(scrollToMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('About Page Header')).toBeInTheDocument();
  });

  it('scrolls into view when navigating with a valid hash', () => {
    const scrollIntoViewMock = vi.fn();
    const mockElem = document.createElement('div');
    mockElem.id = 'faq-section';
    mockElem.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(mockElem);

    render(
      <MemoryRouter initialEntries={['/about#faq-section']}>
        <ScrollToTop />
        <div>Page with hash</div>
      </MemoryRouter>
    );

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
    document.body.removeChild(mockElem);
  });
});

