import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import DataTable from './DataTable.svelte';

interface TestData extends Record<string, unknown> {
  id: number;
  name: string;
  age: number;
  email: string;
}

const mockData: TestData[] = [
  { id: 1, name: 'Alice', age: 30, email: 'alice@example.com' },
  { id: 2, name: 'Bob', age: 25, email: 'bob@example.com' },
  { id: 3, name: 'Charlie', age: 35, email: 'charlie@example.com' },
  { id: 4, name: 'David', age: 28, email: 'david@example.com' },
  { id: 5, name: 'Eve', age: 32, email: 'eve@example.com' },
  { id: 6, name: 'Frank', age: 27, email: 'frank@example.com' },
  { id: 7, name: 'Grace', age: 29, email: 'grace@example.com' },
  { id: 8, name: 'Henry', age: 31, email: 'henry@example.com' },
  { id: 9, name: 'Ivy', age: 26, email: 'ivy@example.com' },
  { id: 10, name: 'Jack', age: 33, email: 'jack@example.com' },
  { id: 11, name: 'Kate', age: 24, email: 'kate@example.com' },
  { id: 12, name: 'Leo', age: 36, email: 'leo@example.com' }
];

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'age', label: 'Age', sortable: true },
  { key: 'email', label: 'Email', sortable: true }
];

describe('DataTable', () => {
  describe('Rendering', () => {
    it('renders table with data', () => {
      render(DataTable, { props: { data: mockData.slice(0, 3), columns } });

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('displays column headers', () => {
      render(DataTable, { props: { data: mockData.slice(0, 3), columns } });

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('displays empty message when no data', () => {
      render(DataTable, { props: { data: [], columns, emptyMessage: 'No data found' } });

      expect(screen.getByText('No data found')).toBeInTheDocument();
    });

    it('uses custom empty message', () => {
      render(DataTable, {
        props: { data: [], columns, emptyMessage: 'Custom empty message' }
      });

      expect(screen.getByText('Custom empty message')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('sorts data in ascending order when column header clicked', async () => {
      const user = userEvent.setup();
      render(DataTable, { props: { data: mockData.slice(0, 5), columns } });

      const nameHeader = screen.getByText('Name').closest('button');
      if (!nameHeader) throw new Error('Name header button not found');

      await user.click(nameHeader);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent('Alice');
    });

    it('sorts data in descending order on second click', async () => {
      const user = userEvent.setup();
      render(DataTable, { props: { data: mockData.slice(0, 5), columns } });

      const nameHeader = screen.getByText('Name').closest('button');
      if (!nameHeader) throw new Error('Name header button not found');

      await user.click(nameHeader);
      await user.click(nameHeader);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent('Eve');
    });

    it('clears sorting on third click', async () => {
      const user = userEvent.setup();
      render(DataTable, { props: { data: mockData.slice(0, 5), columns } });

      const nameHeader = screen.getByText('Name').closest('button');
      if (!nameHeader) throw new Error('Name header button not found');

      await user.click(nameHeader);
      await user.click(nameHeader);
      await user.click(nameHeader);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent('Alice');
    });

    it('sorts numeric columns correctly', async () => {
      const user = userEvent.setup();
      render(DataTable, { props: { data: mockData.slice(0, 5), columns } });

      const ageHeader = screen.getByText('Age').closest('button');
      if (!ageHeader) throw new Error('Age header button not found');

      await user.click(ageHeader);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent('25');
    });

    it('changes sort column when different header clicked', async () => {
      const user = userEvent.setup();
      render(DataTable, { props: { data: mockData.slice(0, 5), columns } });

      const nameHeader = screen.getByText('Name').closest('button');
      const ageHeader = screen.getByText('Age').closest('button');
      if (!nameHeader || !ageHeader) throw new Error('Headers not found');

      await user.click(nameHeader);
      await user.click(ageHeader);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent('25');
    });
  });

  describe('Pagination', () => {
    it('displays only first page of items', () => {
      render(DataTable, { props: { data: mockData, columns, itemsPerPage: 5 } });

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Eve')).toBeInTheDocument();
      expect(screen.queryByText('Frank')).not.toBeInTheDocument();
    });

    it('navigates to next page', async () => {
      const user = userEvent.setup();
      render(DataTable, { props: { data: mockData, columns, itemsPerPage: 5 } });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      expect(screen.getByText('Frank')).toBeInTheDocument();
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });

    it('navigates to previous page', async () => {
      const user = userEvent.setup();
      render(DataTable, { props: { data: mockData, columns, itemsPerPage: 5 } });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Frank')).not.toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
      render(DataTable, { props: { data: mockData, columns, itemsPerPage: 5 } });

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', async () => {
      const user = userEvent.setup();
      render(DataTable, { props: { data: mockData, columns, itemsPerPage: 5 } });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await user.click(nextButton);

      expect(nextButton).toBeDisabled();
    });

    it('navigates to specific page when page number clicked', async () => {
      const user = userEvent.setup();
      render(DataTable, { props: { data: mockData, columns, itemsPerPage: 5 } });

      const page2Button = screen.getByRole('button', { name: '2' });
      await user.click(page2Button);

      expect(screen.getByText('Frank')).toBeInTheDocument();
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });

    it('displays current page information', () => {
      render(DataTable, { props: { data: mockData, columns, itemsPerPage: 5 } });

      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });

    it('does not show pagination controls when data fits on one page', () => {
      render(DataTable, { props: { data: mockData.slice(0, 5), columns, itemsPerPage: 10 } });

      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    });

    it('resets to page 1 when sorting is applied', async () => {
      const user = userEvent.setup();
      render(DataTable, { props: { data: mockData, columns, itemsPerPage: 5 } });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();

      const nameHeader = screen.getByText('Name').closest('button');
      if (!nameHeader) throw new Error('Name header not found');
      await user.click(nameHeader);

      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });
  });

  describe('Custom rendering', () => {
    it('applies custom render function to cell values', () => {
      const customColumns = [
        {
          key: 'age',
          label: 'Age',
          sortable: true,
          render: (value: unknown) => `${value} years`
        }
      ];

      render(DataTable, { props: { data: mockData.slice(0, 3), columns: customColumns } });

      expect(screen.getByText('30 years')).toBeInTheDocument();
      expect(screen.getByText('25 years')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles empty data array', () => {
      render(DataTable, { props: { data: [], columns } });

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('handles single row of data', () => {
      render(DataTable, { props: { data: [mockData[0]], columns } });

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });

    it('handles data with null values', () => {
      const dataWithNulls: TestData[] = [
        { id: 1, name: 'Alice', age: 30, email: null as unknown as string }
      ];
      render(DataTable, { props: { data: dataWithNulls, columns } });

      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });
});
