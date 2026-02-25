import { Component } from 'react';
import { Result, Button } from 'antd';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Kutilmagan xatolik yuz berdi"
          subTitle="Sahifani qayta yuklang"
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              Qayta yuklash
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
