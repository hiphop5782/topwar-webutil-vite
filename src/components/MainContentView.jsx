import { Route, Routes } from "react-router-dom";
import PangeNotFound from "./error/PageNotFound";

export default function MainContentView() {
    return (
    <Routes>
        <Route path="*" element={<PangeNotFound/>}></Route>
    </Routes>
    )
}