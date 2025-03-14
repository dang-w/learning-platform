import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

describe('Tabs Component', () => {
  it('renders tabs correctly', () => {
    const { getByText, queryByText } = render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Tab 1 Content</TabsContent>
        <TabsContent value="tab2">Tab 2 Content</TabsContent>
      </Tabs>
    );

    // Check if tabs are rendered
    expect(getByText('Tab 1')).toBeInTheDocument();
    expect(getByText('Tab 2')).toBeInTheDocument();

    // Check if the default tab content is visible
    expect(getByText('Tab 1 Content')).toBeInTheDocument();
    expect(queryByText('Tab 2 Content')).not.toBeInTheDocument();
  });

  it('switches tabs when clicked', async () => {
    const user = userEvent.setup();
    const { getByText, queryByText } = render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Tab 1 Content</TabsContent>
        <TabsContent value="tab2">Tab 2 Content</TabsContent>
      </Tabs>
    );

    // Initially, Tab 1 content should be visible
    expect(getByText('Tab 1 Content')).toBeInTheDocument();

    // Click on Tab 2
    await user.click(getByText('Tab 2'));

    // Now Tab 2 content should be visible and Tab 1 content should be hidden
    expect(queryByText('Tab 1 Content')).not.toBeInTheDocument();
    expect(getByText('Tab 2 Content')).toBeInTheDocument();
  });

  it('applies custom className to components', () => {
    const { getByRole, getByText } = render(
      <Tabs defaultValue="tab1">
        <TabsList className="custom-list-class">
          <TabsTrigger className="custom-trigger-class" value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent className="custom-content-class" value="tab1">Content</TabsContent>
      </Tabs>
    );

    // Check if custom classes are applied
    expect(getByRole('tablist')).toHaveClass('custom-list-class');
    expect(getByRole('tab')).toHaveClass('custom-trigger-class');
    expect(getByText('Content')).toHaveClass('custom-content-class');
  });
});