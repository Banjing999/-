export const errorHandler = (err, req, res, next) => {
  console.error('❌ 错误:', err);

  // MySQL 错误
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      code: 1001,
      message: '数据重复，请检查输入',
      data: null,
    });
  }

  if (err.code === 'ER_NO_SUCH_TABLE') {
    return res.status(500).json({
      code: 2001,
      message: '数据库表不存在，请先运行初始化脚本',
      data: null,
    });
  }

  res.status(err.status || 500).json({
    code: err.code || 500,
    message: err.message || '服务器内部错误',
    data: null,
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    code: 404,
    message: `路由 ${req.method} ${req.path} 不存在`,
    data: null,
  });
};
