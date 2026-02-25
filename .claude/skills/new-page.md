# Yangi sahifa yaratish

## Qadamlar
1. `client/src/pages/<PageName>/index.jsx` fayl yarat
2. `client/src/App.jsx` ga route qo'sh
3. `client/src/components/AppLayout.jsx` ga sidebar menu item qo'sh

## Sahifa shablon
```jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getItems, createItem, updateItem, deleteItem } from '../../api';

export default function PageName() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data = [], isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: getItems,
  });

  const createMut = useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      message.success('Yaratildi');
      setModalOpen(false);
      form.resetFields();
    },
    onError: () => message.error('Xatolik'),
  });

  const columns = [
    // ustunlar
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Yangi
        </Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="_id" loading={isLoading} />
      <Modal title="Yangi" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={(v) => createMut.mutate(v)}>
          {/* form items */}
        </Form>
      </Modal>
    </div>
  );
}
```

## Qoidalar
- `useQuery` + `useMutation` + `queryClient.invalidateQueries`
- Ant Design components ishlat, inline style ISHLATMA
- Jadval `rowKey="_id"` bo'lsin
