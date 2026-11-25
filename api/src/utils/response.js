// 统一响应格式
export const success = (res, data = null, message = '操作成功') => {
  return res.json({
    code: 0,
    message,
    data,
  });
};

export const fail = (res, message = '操作失败', code = 1, status = 400) => {
  return res.status(status).json({
    code,
    message,
    data: null,
  });
};

export const notFound = (res, message = '资源不存在') => {
  return fail(res, message, 404, 404);
};

export const unauthorized = (res, message = '未授权访问') => {
  return fail(res, message, 401, 401);
};

export const forbidden = (res, message = '权限不足') => {
  return fail(res, message, 403, 403);
};
