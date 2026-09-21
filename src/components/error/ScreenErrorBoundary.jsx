import { Component } from "react";

export default class ScreenErrorBoundary extends Component {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error, info) {
        console.error("화면 표시 오류", error, info.componentStack);
    }

    render() {
        if (!this.state.failed) return this.props.children;
        return <section className="alert alert-danger m-3" role="alert">
            <h2>화면을 표시하지 못했습니다.</h2>
            <p>페이지를 새로고침해 주세요. 투표 중이었다면 참여자 목록에서 반영 여부를 먼저 확인해 주세요.</p>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>새로고침</button>
        </section>;
    }
}
